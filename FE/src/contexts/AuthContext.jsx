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
      setUser({ email, id: 'demo-user', user_metadata: { full_name: 'Demo User' } });
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  /**
   * Đăng ký và tự động đăng nhập ngay.
   * Nếu Supabase yêu cầu xác nhận email, ta vẫn cố sign-in để lấy session.
   * Khi Supabase tắt "Confirm email" (trong dashboard → Auth → Settings),
   * người dùng sẽ được đăng nhập ngay sau khi đăng ký.
   */
  const signUp = async ({ email, password, fullName }) => {
    if (!isSupabaseConfigured) {
      setUser({ email, user_metadata: { full_name: fullName }, id: 'demo-user' });
      return { error: null };
    }

    // Thử đăng ký
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Không dùng emailRedirectTo → Supabase sẽ dùng cài đặt dashboard
      },
    });

    if (signUpError) {
      return { error: signUpError };
    }

    // Nếu đăng ký thành công nhưng chưa có session (email confirm bật),
    // thử signIn luôn để tạo session
    if (!signUpData?.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Nếu signIn thành công → session có, user đã đăng nhập
      if (!signInError && signInData?.session) {
        return { error: null };
      }

      // Vẫn lỗi email chưa confirm → trả thông báo thân thiện
      if (signInError?.message === 'Email not confirmed') {
        return {
          error: {
            message:
              'Tài khoản đã tạo thành công! Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.',
          },
          needsConfirmation: true,
        };
      }

      return { error: signInError };
    }

    return { error: null };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
