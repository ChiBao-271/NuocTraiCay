'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      setUser({ email, id: 'demo-user' });
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async ({ email, password, fullName }) => {
    if (!isSupabaseConfigured) {
      setUser({ email, user_metadata: { full_name: fullName }, id: 'demo-user' });
      return { error: null };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

