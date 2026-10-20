import { useState, type FormEvent } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { isConfigured } from '@/lib/supabase';

export default function AuthModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { signIn, signUp, signInGoogle, resendConfirmation, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [resent,setResent]=useState(false);const [resetSent,setResetSent]=useState(false);

  const reset = () => { setError(null); setConfirm(false); setResent(false); setPassword('');setResetSent(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return setError('Supabase is not configured yet. Add your env vars.');
    setBusy(true); setError(null);
    try {
    if(mode==='reset'){const res=await requestPasswordReset(email.trim());if(res.error)return setError('We could not request the reset email. Please try again later.');setResetSent(true);return;}
    const res = mode === 'login' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    if (res.error) return setError(res.error);
    if (mode === 'signup' && res.needsConfirmation) return setConfirm(true);
    reset(); onClose();
    } catch {setError('We could not reach the sign-in service. Please try again.');}
    finally {setBusy(false);}
  };

  const resend = async () => {
    setBusy(true);setError(null);setResent(false);
    try{const result=await resendConfirmation(email.trim());if(result.error)setError(result.error);else setResent(true);}
    catch{setError('We could not resend the email. Please try again.');}
    finally{setBusy(false);}
  };

  const google = async () => {
    if (!isConfigured) {setError('Sign-in is not available yet.');return;}
    setBusy(true);setError(null);
    try {const result=await signInGoogle();if(result.error)setError(result.error);}
    catch {setError('Google sign-in could not start. Please try again.');}
    finally {setBusy(false);}
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Log in or sign up">
      {confirm ? (
        <div className="py-6 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-leaf" />
          <h2 className="mt-4 font-display text-2xl font-extrabold">Check your inbox</h2>
          <p className="mt-2 text-ink-soft">We sent a confirmation link to <b>{email}</b>. Open it to confirm your email and return to SaveHalf.</p>
          {error&&<p role="alert" className="mt-3 text-sm text-tomato">{error}</p>}
          {resent&&<p role="status" className="mt-3 text-sm">Another confirmation email has been requested. Check your spam folder too.</p>}
          <button type="button" onClick={()=>void resend()} disabled={busy} className="google-signin">{busy?'Sending…':'Resend confirmation email'}</button>
          <button onClick={() => { reset(); setMode('login'); }} className="mt-6 font-semibold text-tomato underline-offset-4 hover:underline">Go to log in</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h2 className="font-display text-3xl font-extrabold">{mode==='reset'?'Reset your password':mode === 'login' ? 'Welcome back' : 'Save your favourites'}</h2>
          <p className="mt-1 text-sm text-ink-soft">{reason ?? (mode === 'login' ? 'Log in to see your hearted deals.' : 'Free account. Heart deals and track what you could save.')}</p>

          {mode!=='reset'&&<><button type="button" onClick={() => void google()} disabled={busy} className="google-signin"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.9a5 5 0 01-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.8l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.8 13.9a6.6 6.6 0 010-3.8V7.2H2.1a11 11 0 000 9.6z"/><path fill="#EA4335" d="M12 5.6c1.6 0 3 .6 4.1 1.6l3.1-3.1A10.5 10.5 0 0012 1a11 11 0 00-9.9 6.2l3.7 2.9C6.7 7.5 9.1 5.6 12 5.6z"/></svg>Continue with Google</button>
          <div className="auth-divider"><span/>or use your email<span/></div></>}
          <label className="mt-6 block text-sm font-semibold" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 outline-none focus:border-ink" />

          {mode!=='reset'&&<><label className="mt-4 block text-sm font-semibold" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={mode==='signup'?12:6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 outline-none focus:border-ink" />
          {mode === 'signup' && <p className="mt-1 text-xs text-ink-mute">At least 12 characters. A unique passphrase works well.</p>}</>}

          {error && <p role="alert" className="mt-4 rounded-lg bg-tomato/10 px-3 py-2 text-sm font-medium text-tomato-dark">{error}</p>}

          <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 font-semibold text-white shadow-[0_4px_0_#000] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode==='reset'?'Send reset link':mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          {resetSent&&<p role="status" className="modal-copy">If this address can receive account email, a reset link has been requested. Check your inbox and spam folder.</p>}
          {mode==='login'&&<button type="button" className="auth-recovery-link" onClick={()=>{reset();setMode('reset');}}>Forgot password?</button>}
          {mode==='reset'&&<button type="button" className="auth-recovery-link" onClick={()=>{reset();setMode('login');}}>Back to login</button>}
          {mode!=='reset'&&<p className="mt-5 text-center text-sm text-ink-soft">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => { reset(); setMode(mode === 'login' ? 'signup' : 'login'); }} className="font-semibold text-tomato underline-offset-4 hover:underline">
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>}
        </form>
      )}
    </Modal>
  );
}
