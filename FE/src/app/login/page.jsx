'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { signIn, isSupabaseConfigured } = useAuth();
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('next');
    if (requested && requested.startsWith('/') && !requested.startsWith('//')) setNextPath(requested);
  }, []);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(formData);
    setLoading(false);

    if (result.error) {
      const map = {
        'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
        'Email not confirmed': 'Vui lòng xác nhận email trước khi đăng nhập.',
      };
      
      const errMsg = result.error.message || '';
      setError(map[errMsg] || errMsg || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
      return;
    }

    // Redirect theo role
    if (nextPath !== '/') {
      router.replace(nextPath);
    } else if (result.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left: Hero ── */}
      <div className="auth-hero" style={{ backgroundImage: 'url(/login-hero.jpg)' }}>
        {/* Brand badge */}
        <div className="auth-hero-brand">
          <span className="auth-hero-brand-mark" aria-hidden="true">OF</span>
          <span className="auth-hero-brand-name">Original Fruits</span>
        </div>

        {/* Bottom text */}
        <div className="auth-hero-bottom">
          <h2>Nguồn Năng Lượng Tự Nhiên</h2>
          <p>Sức khỏe bắt đầu từ những thói quen đơn giản nhất. Hãy để chúng tôi đồng hành cùng bạn.</p>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="auth-form-side">
        <Link href="/" className="auth-back-btn" aria-label="Về trang chủ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Về trang chủ
        </Link>
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h1>Chào mừng trở lại!</h1>
            <p>Đăng nhập để nhận ly nước ép mát lạnh mỗi sáng của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="auth-fields">
            {/* Email */}
            <div className="auth-field-group">
              <label htmlFor="login-email" className="auth-label">Email hoặc Số điện thoại</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="username@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field-group">
              <label htmlFor="login-password" className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="auth-row-options">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="auth-checkbox"
                />
                <span className="auth-checkbox-custom" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button type="button" className="auth-forgot-btn">Quên mật khẩu?</button>
            </div>

            {/* Error */}
            {error && (
              <div className="auth-error-msg" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="auth-btn-spinner" />
              ) : 'Đăng Nhập'}
            </button>
          </form>

          {/* Social divider */}
          <div className="auth-divider">
            <span>Hoặc kết nối bằng</span>
          </div>

          <div className="auth-social-row">
            <button type="button" className="auth-social-btn" id="login-google-btn">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button type="button" className="auth-social-btn" id="login-apple-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
            <button type="button" className="auth-social-btn" id="login-facebook-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          {/* Switch to Register */}
          <p className="auth-switch-text">
            Bạn chưa có tài khoản?{' '}
            <Link href="/register" className="auth-switch-link">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
