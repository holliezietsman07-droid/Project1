import { showSuccess } from '@/utils/toast';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FocusedForm } from '@/components/accounts/FocusedForm';
import { useSession } from '@/contexts/SessionContext';
import { useRows, useRefreshAcademy } from '@/hooks/use-academy';
import { errorText, rpc } from '@/lib/academy';
import { pathways } from '@/lib/hka-content';
import { riderPreferences } from '@/lib/dashboard-workspace';

export function RiderPreferencesEditor({ open, onOpenChange }: { open?: boolean; onOpenChange?: (value: boolean) => void }) {
  const { profile } = useSession(), roles = useRows('hka_account_roles'), refresh = useRefreshAcademy();
  const [message, setMessage] = useState('');
  if (!profile) return null;
  const preferences = riderPreferences(roles.data ?? [], profile.id);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || roles.error || !roles.data) return false;
    const form = new FormData(event.currentTarget);
    try {
      const pathway = String(form.get('learning_pathway') ?? '');
      if (pathway && !pathways.some(row => row.id === pathway)) throw new Error('Choose an existing learning pathway.');
      await rpc('hka_request_account_purpose', { requested_purpose: 'student', onboarding_data: {
        ...preferences, primary_discipline: String(form.get('primary_discipline')).trim(),
        additional_disciplines: String(form.get('additional_disciplines') ?? '').trim(),
        experience_level: form.get('experience_level'), riding_goals: String(form.get('riding_goals')).trim(),
        learning_pathway: pathway || null,
      } });
      await refresh(); setMessage(showSuccess('Rider preferences saved.')); return true;
    } catch (error) { setMessage(errorText(error)); return false; }
  }
  if (roles.isLoading) return <p role='status' className='text-sm text-muted-foreground'>Loading rider preferences…</p>;
  if (roles.error) return <p role='alert' className='text-sm text-destructive'>Rider preferences could not be loaded. Please try again.</p>;
  return <FocusedForm title='Your riding journey' triggerLabel='Edit discipline, level and goals'
    description='A few saved preferences help you choose your next step.' feedback={message}
    onSubmit={save} open={open} onOpenChange={onOpenChange}>
    <div><Label htmlFor='rider-discipline'>Primary discipline</Label><Input id='rider-discipline' name='primary_discipline' required maxLength={100} defaultValue={String(preferences.primary_discipline ?? '')}/></div>
    <div><Label htmlFor='rider-other'>Additional disciplines (optional)</Label><Input id='rider-other' name='additional_disciplines' maxLength={300} defaultValue={String(preferences.additional_disciplines ?? '')}/></div>
    <div><Label htmlFor='rider-level'>Riding experience</Label><select id='rider-level' name='experience_level' required defaultValue={String(preferences.experience_level ?? '')} className='h-11 w-full rounded-md border bg-background px-3 text-sm'><option value=''>Choose level</option>{['beginner','novice','intermediate','advanced','professional'].map(level => <option key={level} value={level}>{level}</option>)}</select></div>
    <div><Label htmlFor='rider-goals'>Your learning goals</Label><Textarea id='rider-goals' name='riding_goals' required maxLength={1500} defaultValue={String(preferences.riding_goals ?? '')}/></div>
    <div><Label htmlFor='rider-pathway'>Preferred learning pathway (optional)</Label><select id='rider-pathway' name='learning_pathway' defaultValue={String(preferences.learning_pathway ?? '')} className='h-11 w-full rounded-md border bg-background px-3 text-sm'><option value=''>Explore before choosing</option>{pathways.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></div>
    <Button type='submit' className='w-fit'>Save rider preferences</Button>
  </FocusedForm>;
}
