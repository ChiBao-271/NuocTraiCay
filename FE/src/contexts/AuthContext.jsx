'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase/client.js';

const AuthContext = createContext(null);

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:5000';

/** Lấy role của user từ BE API (không gọi Supabase trực tiếp) */
async function fetchUserRole(userId, accessToken) {
  if (!userId) return 'customer';
  try {
    const res = await fetch(`${BE_URL}/api/users/profile/${userId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) return 'customer';
    const json = await res.json();
    return json.data?.role ?? 'customer';
  } catch {
    return 'customer';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // null = chưa biết
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const role = await fetchUserRole(sessionUser.id, data.session.access_token);
        setUserRole(role);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      // Keep role unresolved until the profile lookup finishes. AdminShell must
      // not redirect an admin during this short authentication-state window.
      setUserRole(null);
      if (sessionUser && session?.access_token) {
        // Avoid awaiting another Supabase request inside its auth-state callback.
        queueMicrotask(() => fetchUserRole(sessionUser.id, session.access_token).then(setUserRole));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      setUser({ email, id: 'demo-user', user_metadata: { full_name: 'Demo User' } });
      setUserRole('customer');
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      const { data: sessionData } = await supabase.auth.getSession();
      const role = await fetchUserRole(data.user.id, sessionData.session?.access_token);
      setUserRole(role);
      return { data, error: null, role };
    }
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
      userRole,
      isAdmin: userRole === 'admin',
      loading,
      isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, userRole, loading],
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
