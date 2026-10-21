import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isConfigured, isPasswordRecoveryReturn } from '@/lib/supabase';

type Result = { error: string | null; needsConfirmation?: boolean };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  recovery:boolean;
  finishRecovery:()=>void;
  requestPasswordReset:(email:string,captchaToken?:string)=>Promise<Result>;
  updatePassword:(password:string)=>Promise<Result>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<Result>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Result>;
  resendConfirmation: (email: string,captchaToken?:string) => Promise<Result>;
  signInGoogle: () => Promise<Result>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [recovery,setRecovery]=useState(isPasswordRecoveryReturn);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event,s)=>{setSession(s);if(event==='PASSWORD_RECOVERY')setRecovery(true);});
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      loading,recovery,finishRecovery:()=>setRecovery(false),
      requestPasswordReset:async(email,captchaToken)=>{const {error}=await supabase.auth.resetPasswordForEmail(email,{captchaToken,redirectTo:`${window.location.origin}/`});return {error:error?.message??null};},
      updatePassword:async(password)=>{if(password.length<12)return {error:'Use at least 12 characters.'};const {error}=await supabase.auth.updateUser({password});return {error:error?.message??null};},
      signUp: async (email, password, captchaToken) => {
        if(password.length<12)return {error:'Use at least 12 characters.'};
        const { data, error } = await supabase.auth.signUp({ email, password, options: { captchaToken, emailRedirectTo: `${window.location.origin}/` } });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      signIn: async (email, password, captchaToken) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options:{captchaToken} });
        return { error: error?.message ?? null };
      },
      resendConfirmation: async (email,captchaToken) => {
        const { error } = await supabase.auth.resend({type:'signup',email,options:{captchaToken,emailRedirectTo:`${window.location.origin}/`}});
        return {error:error?.message??null};
      },
      signInGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`}});
        return {error:error?.message??null};
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, recovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth hook intentionally shares its provider module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
