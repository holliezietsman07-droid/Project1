import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LockKeyhole, Pencil, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { AccountRoleSettings } from '@/components/accounts/AccountRoles';
import { DashboardHero, SelfAvatarEditor } from '@/components/accounts/StudentDashboard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/contexts/SessionContext';
import { db, errorText } from '@/lib/academy';

const preferenceLabels: Record<string, { title: string; description: string }> = {
  academy: { title: 'Academy updates', description: 'Important learning and academy notices.' },
  coaching: { title: 'Coaching updates', description: 'Requests, approvals and lesson changes.' },
  feedback: { title: 'Feedback received', description: 'Released assessment and coach feedback.' },
  horse_care_email: { title: 'Horse-care email reminders', description: 'Opt in to approved care reminders by email.' },
};

export default function MemberAccountSettings() {
  const { profile, session, refreshProfile } = useSession();
  const [editing, setEditing] = useState(false);
  const [dirty,setDirty]=useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPreferences(profile?.notification_preferences ?? {});
  }, [profile?.notification_preferences]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    try {
      const name = String(form.get('full_name')).trim(), timezone = String(form.get('timezone')).trim();
      if (!name) throw new Error('Enter your name.');
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
      catch { throw new Error('Choose a valid timezone, such as Africa/Lusaka.'); }
      const { error } = await db().from('hka_profiles').update({
        full_name: name,
        timezone,
      }).eq('id', profile.id).select('id').single();
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      setMessage('Profile details saved.');
    } catch (failure) {
      setMessage(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function updatePreference(key: string, checked: boolean) {
    if (!profile || busy) return;
    const previous = preferences;
    const next = { ...previous, [key]: checked };
    setPreferences(next);
    setBusy(true);
    setMessage('');
    try {
      const { error } = await db().from('hka_profiles').update({ notification_preferences: next }).eq('id', profile.id).select('id').single();
      if (error) throw error;
      await refreshProfile();
      setMessage('Notification preference saved.');
    } catch (failure) {
      setPreferences(previous);
      setMessage(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return <section className='dashboard-shell page-width py-8 lg:py-10'>
    <DashboardHero label='Account settings' defaultSubtitle='Manage your profile, preferences, security and authorised account relationships.' />
    <div className='mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]'>
      <aside className='space-y-6'>
        <section className='paper-card p-6 sm:p-8'>
          <p className='eyebrow text-[#826e45]'>Profile overview</p>
          <div className='mt-5 flex flex-col gap-5 sm:flex-row sm:items-center'>
            <SelfAvatarEditor className='size-24' />
            <div className='min-w-0'>
              <h2 className='truncate font-serif text-3xl'>{profile.full_name}</h2>
              <p className='mt-1 capitalize text-sm text-muted-foreground'>{profile.role}</p>
              <p className='mt-1 break-all text-xs text-muted-foreground'>{session?.user.email}</p>
            </div>
          </div>
          <Button type='button' variant='outline' className='mt-6 w-full' onClick={() => {setDirty(false);setEditing(true);}}><Pencil className='size-4' />Edit profile</Button>
        </section>
        <section className='paper-card p-6'>
          <div className='flex items-start gap-3'><LockKeyhole className='mt-1 size-5 text-[#826e45]' /><div><h2 className='font-serif text-2xl'>Security</h2><p className='mt-2 text-sm leading-6 text-muted-foreground'>Password changes use Supabase secure recovery. Passwords are never stored by HKA.</p></div></div>
          <Button asChild variant='outline' className='mt-5 w-full'><Link to='/password-reset'>Change password</Link></Button>
        </section>
      </aside>
      <div className='space-y-6'>
        <section className='paper-card p-6 sm:p-8'>
          <div className='flex items-start gap-3'><Bell className='mt-1 size-5 text-[#826e45]' /><div><h2 className='font-serif text-3xl'>Notifications</h2><p className='mt-2 text-sm text-muted-foreground'>Changes save immediately and roll back if saving fails.</p></div></div>
          <div className='mt-6 divide-y divide-primary/10'>
            {Object.entries(preferenceLabels).map(([key, item]) => <div key={key} className='flex items-center justify-between gap-5 py-4'>
              <div><Label htmlFor={'preference-' + key} className='text-sm'>{item.title}</Label><p className='mt-1 text-xs leading-5 text-muted-foreground'>{item.description}</p></div>
              <Switch id={'preference-' + key} checked={preferences[key] ?? key !== 'horse_care_email'} disabled={busy} onCheckedChange={checked => void updatePreference(key, checked)} />
            </div>)}
          </div>
        </section>
        <div className='grid gap-6 md:grid-cols-2'>
          <section className='paper-card p-6'><div className='flex items-start gap-3'><UserRound className='mt-1 size-5 text-[#826e45]' /><div><h2 className='font-serif text-2xl'>Personal information</h2><p className='mt-2 text-sm text-muted-foreground'>{profile.full_name}<br />{profile.timezone}</p></div></div></section>
          <section className='paper-card p-6'><div className='flex items-start gap-3'><SlidersHorizontal className='mt-1 size-5 text-[#826e45]' /><div><h2 className='font-serif text-2xl'>Preferences</h2><p className='mt-2 text-sm text-muted-foreground'>Times display using {profile.timezone}. Academy styling follows HKA defaults.</p></div></div></section>
        </div>
        <section className='paper-card p-6 sm:p-8'>
          <div className='mb-6 flex items-start gap-3'><ShieldCheck className='mt-1 size-5 text-[#826e45]' /><div><h2 className='font-serif text-3xl'>Account roles & linked relationships</h2><p className='mt-2 text-sm text-muted-foreground'>Only authorised roles and verified relationships can access linked records.</p></div></div>
          <AccountRoleSettings />
        </section>
      </div>
    </div>
    {message && <p className='fixed bottom-5 left-1/2 z-40 w-[90vw] max-w-md -translate-x-1/2 rounded-lg border border-[#B79B62]/40 bg-[#fffdf8] px-5 py-3 text-sm shadow-xl' role='status'>{message}</p>}
    <WorkflowDialog open={editing} onOpenChange={value=>{if(!busy){setEditing(value);if(!value)setDirty(false);}}} title='Edit personal information' description='Update only details that need changing.' dirty={dirty} busy={busy}><form onChange={()=>setDirty(true)} id='profile-editor' className='grid gap-4' onSubmit={saveProfile}>
          <div><Label htmlFor='settings-full-name'>Full name</Label><Input id='settings-full-name' name='full_name' autoComplete='name' defaultValue={profile.full_name} required maxLength={100} /></div>
          <div><Label htmlFor='settings-timezone'>Timezone</Label><Input id='settings-timezone' name='timezone' autoComplete='off' defaultValue={profile.timezone} required maxLength={100} /></div>
        </form><DialogFooter><DialogClose asChild><Button type='button' variant='outline' disabled={busy}>Cancel</Button></DialogClose><Button type='submit' form='profile-editor' disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></DialogFooter></WorkflowDialog>
  </section>;
}
