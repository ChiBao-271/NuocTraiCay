'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!agree) {
      setError('Vui lòng đồng ý với Điều khoản & Điều kiện.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
    });
    setLoading(false);

    if (result.error) {
      if (result.needsConfirmation) {
        setSuccess(result.error.message);
        return;
      }
      const map = {
        'User already registered': 'Email này đã được đăng ký. Vui lòng đăng nhập.',
        'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự.',
      };
      
      const errMsg = result.error.message || '';
      setError(map[errMsg] || 'Đã có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại sau.');
      return;
    }

    router.push('/');
  };

  return (
    <div className="auth-page">
      {/* ── Left: Hero ── */}
      <div className="auth-hero" style={{ backgroundImage: 'url(/register-hero.jpg)' }}>
        <div className="auth-hero-brand">
          <span className="auth-hero-brand-mark" aria-hidden="true">OF</span>
          <span className="auth-hero-brand-name">Original Fruits</span>
        </div>
        <div className="auth-hero-bottom">
          <h2>Trở Thành Thành Viên</h2>
          <p>Tham gia gia đình Original Fruits để nhận những ưu đãi hấp dẫn &amp; cập nhật thực đơn nước ép mới nhất.</p>
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
            <h1>Tạo Tài Khoản Mới</h1>
            <p>Nước ép trái cây tươi ngon giúp cuộc sống tràn đầy niềm vui.</p>
          </div>

          {success ? (
            <div className="auth-success-box">
              <span className="auth-success-icon">✅</span>
              <p>{success}</p>
              <Link href="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Đến trang đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="auth-fields">
              {/* Họ và Tên */}
              <div className="auth-field-group">
                <label htmlFor="reg-name" className="auth-label">Họ và Tên</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="reg-name"
                    name="fullName"
                    type="text"
                    placeholder="Maya Citrus"
                    value={formData.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="auth-field-group">
                <label htmlFor="reg-email" className="auth-label">Địa chỉ Email</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    placeholder="maya.citrus@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="auth-field-group">
                <label htmlFor="reg-phone" className="auth-label">Số điện thoại</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    placeholder="090 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field-group">
                <label htmlFor="reg-password" className="auth-label">Mật khẩu</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="auth-field-group">
                <label htmlFor="reg-confirm" className="auth-label">Xác nhận mật khẩu</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(v => !v)} aria-label="Toggle confirm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Terms */}
              <label className="auth-checkbox-label auth-terms">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="auth-checkbox"
                />
                <span className={`auth-checkbox-custom${agree ? ' checked' : ''}`} />
                <span>
                  Tôi đồng ý với các{' '}
                  <button type="button" className="auth-terms-link">Điều khoản &amp; Điều kiện</button>
                  {' '}sử dụng dịch vụ.
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="auth-error-msg" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading} id="register-submit-btn">
                {loading ? <span className="auth-btn-spinner" /> : 'Tạo Tài Khoản'}
              </button>
            </form>
          )}

          <p className="auth-switch-text">
            Bạn đã có tài khoản?{' '}
            <Link href="/login" className="auth-switch-link">Đăng nhập tại đây</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
