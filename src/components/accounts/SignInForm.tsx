import { useEffect, useRef, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { db } from '@/lib/academy';
import { useSession } from '@/contexts/SessionContext';
import { SESSION_PREFERENCE } from '@/lib/auth-storage';
import { setSessionPersistence } from '@/integrations/supabase/client';

export function SignInForm() {
  const { beginSignIn } = useSession();
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const [rememberEmail, setRememberEmail] = useState(() => localStorage.getItem('hka-remembered-email') !== null);
  const [staySignedIn, setStaySignedIn] = useState(() => localStorage.getItem(SESSION_PREFERENCE) !== 'session');
  useEffect(() => {
    const saved = localStorage.getItem('hka-remembered-email');
    if (!saved || !formRef.current) return;
    const restore = () => {
      const input = formRef.current?.querySelector<HTMLInputElement>('input[type=email]');
      if (input && !input.value) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, saved);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    const observer = new MutationObserver(restore);
    observer.observe(formRef.current, { childList: true, subtree: true });
    const timer = window.setTimeout(restore, 0);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, []);
  return <div ref={formRef} onSubmitCapture={event => {
    setError('');
    try {
    const email = (event.target as HTMLFormElement).querySelector<HTMLInputElement>('input[type=email]')?.value.trim();
    if (rememberEmail && email) localStorage.setItem('hka-remembered-email', email);
    else localStorage.removeItem('hka-remembered-email');
    setSessionPersistence(staySignedIn);
    beginSignIn();
    } catch { event.preventDefault(); event.stopPropagation(); setError('Browser storage is unavailable. Allow storage to sign in securely.'); }
  }}>
    {error && <p role='alert' className='mb-3 text-sm text-destructive'>{error}</p>}
    <Auth supabaseClient={db()} providers={[]} theme='light' view='sign_in' showLinks={false} redirectTo={window.location.origin + '/dashboard'} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#304b3f', brandAccent: '#243c31', inputBackground: '#f7f3e9', inputText: '#304b3f', inputLabelText: '#304b3f' }, radii: { borderRadiusButton: '2px', buttonBorderRadius: '2px', inputBorderRadius: '2px' } } } }} />
    <div className='mt-3 space-y-1'>
      <label className='flex min-h-11 cursor-pointer items-center gap-3 text-xs'><input type='checkbox' className='size-4 shrink-0 accent-[#2F4A3C]' checked={rememberEmail} onChange={event => { setRememberEmail(event.target.checked); if(!event.target.checked) localStorage.removeItem('hka-remembered-email'); }}/><span>Remember my email on this device</span></label>
      <label className='flex min-h-11 cursor-pointer items-center gap-3 text-xs'><input type='checkbox' className='size-4 shrink-0 accent-[#2F4A3C]' checked={staySignedIn} onChange={event => { setStaySignedIn(event.target.checked); setSessionPersistence(event.target.checked); }}/><span>Stay signed in on this device</span></label>
      <p className='text-xs leading-5 text-muted-foreground'>If unchecked, your session is kept in this browser tab only. Remembering your email does not remember your password.</p>
    </div>
  </div>;
}
