import { createContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, ADMIN_EMAILS } from '../firebase/config';
import { t, getLang } from '../i18n/translations';
import type { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadingTimeout = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (active) setUser(session?.user ?? null);
      })
      .catch((error) => {
        console.error('Unable to restore login session:', error);
      })
      .finally(() => {
        window.clearTimeout(loadingTimeout);
        if (active) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = !!(user?.email && ADMIN_EMAILS.some(e => e.toLowerCase() === user.email!.toLowerCase()));

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    // Only allow registration if email is in the members table
    const { data: member } = await supabase.from('members').select('email').eq('email', email).maybeSingle();
    if (!member) throw new Error(t[getLang()]['not_in_member_list']);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
