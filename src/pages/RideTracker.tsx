import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useRows, useRefreshAcademy } from '@/hooks/use-academy';
import { useUnsavedWork } from '@/hooks/use-unsaved-work';
import { db, errorText } from '@/lib/academy';
import { rideDistance, rideGpx, type RidePoint } from '@/lib/ride-route';
import { showSuccess } from '@/utils/toast';

type Ride = {
  id: string;
  horseId: string;
  kind: string;
  start: number;
  finish?: number;
};

const rideTypes = ['Flatwork', 'Hack', 'Jumping', 'Conditioning', 'Other'];
const prefix = 'Ride Tracker · ';
const timeLabel = (seconds: number) => [
  Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60,
].map(n => String(n).padStart(2, '0')).join(':');

function HorseRideTracker({ riderId, timezone }: { riderId: string; timezone: string }) {
  const filters = { student_id: riderId };
  const horses = useRows('hka_horses', filters);
  const history = useRows('hka_training_records', filters);
  const refresh = useRefreshAcademy();
  const [horse, setHorse] = useState('');
  const [kind, setKind] = useState(rideTypes[0]);
  const [gps, setGps] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [now, setNow] = useState(0);
  const [meters, setMeters] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('');
  const [pointCount, setPointCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const track = useRef<RidePoint[][]>([]);
  const segmentBreak = useRef(true);
  const distance = useRef(0);
  const writeInProgress = useRef(false);
  const start = ride?.start;
  const finish = ride?.finish;
  useUnsavedWork(Boolean(ride));

  useEffect(() => {
    if (!start || finish) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [start, finish]);

  useEffect(() => {
    if (!start || finish || !gps || !navigator.geolocation) return;
    let active = true;
    const visibility = () => {
      segmentBreak.current = true;
      setGpsStatus(document.hidden ? 'GPS paused while HKA is hidden.' : 'Waiting for a fresh GPS fix…');
    };
    document.addEventListener('visibilitychange', visibility);
    const watch = navigator.geolocation.watchPosition(position => {
      if (!active || document.hidden || position.timestamp < start) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy > 30) {
        setGpsStatus('Weak GPS signal. Waiting for a more accurate fix…');
        return;
      }
      const point = { latitude, longitude, timestamp: position.timestamp };
      const segment = track.current.at(-1);
      const previous = segment?.at(-1);
      const gap = previous ? (point.timestamp - previous.timestamp) / 1000 : 0;
      if (previous && gap <= 0) return;
      if (segmentBreak.current || !segment || !previous || gap > 30) {
        segmentBreak.current = false;
        track.current.push([point]);
      } else {
        const step = rideDistance(previous, point);
        if (step / gap > 25) { segmentBreak.current = true; return; }
        if (step < Math.max(4, accuracy / 2)) return;
        segment.push(point);
        distance.current += step;
        setMeters(distance.current);
      }
      setPointCount(count => count + 1);
      setGpsStatus('GPS recording');
    }, failure => {
      if (!active) return;
      segmentBreak.current = true;
      setGpsStatus(failure.code === 1 ? 'Location access denied. The ride timer is still running.' : 'GPS signal unavailable. The ride timer is still running.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', visibility);
      navigator.geolocation.clearWatch(watch);
    };
  }, [start, finish, gps]);

  const selected = horse || horses.data?.[0]?.id || '';
  const seconds = start ? Math.max(0, Math.floor(((finish ?? now) - start) / 1000)) : 0;
  const gpsAvailable = window.isSecureContext && Boolean(navigator.geolocation);
  const logs = (history.data ?? []).filter(item => String(item.notes ?? '').startsWith(prefix))
    .sort((a, b) => String(b.recorded_on).localeCompare(String(a.recorded_on)));
  const horseName = (id: string) => String(horses.data?.find(item => item.id === id)?.name ?? 'Horse');

  function startRide() {
    if (!horses.data?.some(item => item.id === selected)) return;
    const time = Date.now();
    track.current = [];
    segmentBreak.current = true;
    distance.current = 0;
    setMeters(0);
    setPointCount(0);
    setNow(time);
    setError('');
    setGpsStatus(gps ? 'Waiting for GPS…' : 'Timer only');
    setRide({ id: crypto.randomUUID(), horseId: selected, kind, start: time });
  }

  function downloadRoute() {
    const url = URL.createObjectURL(new Blob([rideGpx(track.current)], { type: 'application/gpx+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hka-ride.gpx';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveRide() {
    if (!ride?.finish || writeInProgress.current) return;
    writeInProgress.current = true;
    setSaving(true);
    setError('');
    try {
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Africa/Lusaka', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(ride.start);
      const datePart = (name: string) => date.find(part => part.type === name)?.value;
      const recordedOn = [datePart('year'), datePart('month'), datePart('day')].join('-');
      const notes = prefix + ride.kind + ' · ' + timeLabel(seconds) + (pointCount > 1 ? ' · ' + (meters / 1000).toFixed(2) + ' km (recorded GPS)' : '');
      const records = db().from('hka_training_records');
      const { error: failure } = await records.insert({ id: ride.id, student_id: riderId, horse_id: ride.horseId, recorded_on: recordedOn, notes }).select('id').single();
      if (failure) {
        if (failure.code !== '23505') throw failure;
        const { data, error: readFailure } = await db().from('hka_training_records').select('id').eq('id', ride.id).eq('student_id', riderId).maybeSingle();
        if (readFailure || !data) throw readFailure ?? failure;
      }
      setRide(null);
      track.current = [];
      refresh();
      showSuccess('Ride saved.');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }

  return <section className='page-width py-8 lg:py-12'>
    <h1 className='section-heading text-4xl'>Ride Tracker</h1>
    <section className='paper-card mt-5 p-4 sm:p-6'>
      {ride ? <>
        <h2 className='font-serif text-2xl'>{finish ? 'Ride summary' : 'Ride in progress'}</h2>
        <p className='mt-2 text-sm text-muted-foreground'>{horseName(ride.horseId)} · {ride.kind}</p>
        <p className='mt-3 text-3xl tabular-nums'>{timeLabel(seconds)}</p>
        {gps && <p className='mt-2 text-sm' role='status'>{finish ? (pointCount ? 'Recorded distance ' + (meters / 1000).toFixed(2) + ' km' : 'No GPS points were recorded.') : gpsStatus + ' · ' + (meters / 1000).toFixed(2) + ' km'}</p>}
        {finish && pointCount > 0 && <p className='mt-2 text-sm text-muted-foreground'>Download GPX before saving if you want to keep the route.</p>}
        <div className='mt-4 flex flex-wrap gap-2'>
          {finish ? <>
            <Button type='button' onClick={() => void saveRide()} disabled={saving}>{saving ? 'Saving…' : 'Save ride'}</Button>
            {pointCount > 0 && <Button type='button' variant='outline' onClick={downloadRoute}>Download GPX</Button>}
          </> : <Button type='button' onClick={() => setRide({ ...ride, finish: Date.now() })}>Finish ride</Button>}
        </div>
      </> : <>
        <h2 className='font-serif text-2xl'>Start a ride</h2>
        {horses.isLoading ? <p role='status' className='mt-3'>Loading horses…</p> : horses.error ? <p role='alert' className='mt-3 text-destructive'>{errorText(horses.error)}</p> : !horses.data?.length ?
          <p className='mt-3 text-sm'>Add a horse in <Link to='/dashboard/student?section=horses' className='underline'>Horses</Link> to start tracking rides.</p> :
          <div className='mt-4 grid gap-3'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='grid gap-1 text-sm'>Horse<select className='min-h-11 rounded-lg border bg-background px-2' value={selected} onChange={event => setHorse(event.target.value)}>
                {horses.data.map(item => <option value={item.id} key={item.id}>{String(item.name)}</option>)}
              </select></label>
              <label className='grid gap-1 text-sm'>Ride type<select className='min-h-11 rounded-lg border bg-background px-2' value={kind} onChange={event => setKind(event.target.value)}>
                {rideTypes.map(type => <option key={type}>{type}</option>)}
              </select></label>
            </div>
            <label className='flex min-h-11 items-center gap-2 text-sm'><input type='checkbox' checked={gps} disabled={!gpsAvailable} onChange={event => setGps(event.target.checked)} /> Record GPS route</label>
            <p className='text-sm text-muted-foreground'>{gpsAvailable ? 'Keep HKA open and your screen awake for GPS. Download the route before saving if you want to keep it. HKA saves the ride summary.' : 'GPS is unavailable in this browser. You can still time your ride.'}</p>
            <div><Button type='button' onClick={startRide}>Start ride</Button></div>
          </div>}
      </>}
      {error && <p role='alert' className='mt-3 text-sm text-destructive'>{error}</p>}
    </section>
    <section className='paper-card mt-4 p-4 sm:p-6'>
      <h2 className='font-serif text-2xl'>Ride log</h2>
      {history.isLoading ? <p role='status' className='mt-3'>Loading rides…</p> : history.error ? <p role='alert' className='mt-3 text-destructive'>{errorText(history.error)}</p> :
        logs.length ? <ul className='mt-3 divide-y divide-primary/15'>{logs.map(item => <li className='py-3 text-sm' key={item.id}>
          <strong>{horseName(String(item.horse_id))}</strong><p className='text-muted-foreground'>{String(item.recorded_on)} · {String(item.notes).slice(prefix.length)}</p>
        </li>)}</ul> : <p className='mt-3 text-sm text-muted-foreground'>Your saved rides will appear here.</p>}
    </section>
  </section>;
}

export default function RideTracker() {
  const { profile } = useSession();
  return profile ? <HorseRideTracker key={profile.id} riderId={profile.id} timezone={profile.timezone} /> : null;
}
