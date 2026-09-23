'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

/** Animated fruit decoration for the modal hero area */
function AuthHeroArt({ mode }) {
  const loginFruits = ['🍊', '🥝', '🍓', '✨'];
  const registerFruits = ['🌱', '🍋', '🥭', '🎉'];
  const fruits = mode === 'success' ? ['🎉', '✅', '🥳', '🌟'] : mode === 'login' ? loginFruits : registerFruits;

  return (
    <div className="auth-hero-art" aria-hidden="true">
      {fruits.map((fruit, index) => (
        <span key={index} style={{ animationDelay: `${-index * 0.8}s` }}>
          {fruit}
        </span>
      ))}
    </div>
  );
}

/** Success state shown after login or register */
function AuthSuccess({ mode, email, onClose }) {
  return (
    <div className="auth-success-state">
      <AuthHeroArt mode="success" />

      <div className="auth-success-content">
        <span className="auth-success-badge">
          {mode === 'login' ? '🎊 Chào mừng trở lại!' : '🌟 Tài khoản đã tạo!'}
        </span>
        <h2 id="auth-title">
          {mode === 'login' ? 'Đăng nhập thành công' : 'Đăng ký thành công'}
        </h2>
        <p className="auth-success-email">{email}</p>
        <p className="auth-success-desc">
          {mode === 'login'
            ? 'Bạn có thể bắt đầu khám phá và đặt hàng các sản phẩm yêu thích.'
            : 'Tài khoản đã được tạo. Hãy bắt đầu mua sắm trái cây tươi ngon!'}
        </p>

        <button
          className="btn btn-primary full-width auth-success-cta"
          type="button"
          onClick={onClose}
          id="auth-success-continue"
        >
          {mode === 'login' ? '🛒 Khám phá sản phẩm' : '🚀 Bắt đầu mua sắm'}
        </button>
      </div>
    </div>
  );
}

export function AuthModal({ onClose }) {
  const { signIn, signUp, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('error');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (status) setStatus('');
  };

  const handleTabChange = (newMode) => {
    setMode(newMode);
    setStatus('');
    setFormData({ fullName: '', email: '', password: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');

    const action = mode === 'login' ? signIn : signUp;
    const { error, needsConfirmation } = await action(formData);

    setSubmitting(false);

    if (error) {
      if (needsConfirmation) {
        setStatusType('success');
        setStatus(error.message);
        return;
      }
      
      setStatusType('error');
      // Translate common Supabase error messages to Vietnamese
      const errorMap = {
        'Invalid login credentials': 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.',
        'Email not confirmed': 'Vui lòng xác nhận email của bạn trước khi đăng nhập.',
        'User already registered': 'Email này đã được đăng ký. Hãy đăng nhập thay vì đăng ký.',
        'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự.',
      };
      setStatus(errorMap[error.message] || error.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      return;
    }

    // Show success state
    setSuccessMode(mode);
    setShowSuccess(true);

    // Auto-close after 2.5 seconds
    window.setTimeout(onClose, 2500);
  };

  if (showSuccess) {
    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          className="auth-modal auth-modal-success"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button className="modal-close" type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
          <AuthSuccess
            mode={successMode}
            email={formData.email}
            onClose={onClose}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        <AuthHeroArt mode={mode} />

        <div className="panel-heading">
          <span className="eyebrow">Tài khoản</span>
          <h2 id="auth-title">{mode === 'login' ? 'Chào mừng trở lại 👋' : 'Tạo tài khoản mới'}</h2>
          <p>
            {mode === 'login'
              ? 'Đăng nhập để đặt hàng và tích điểm thưởng.'
              : 'Tham gia ngay để nhận ưu đãi độc quyền!'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            id="tab-login"
            onClick={() => handleTabChange('login')}
          >
            🔑 Đăng nhập
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            id="tab-register"
            onClick={() => handleTabChange('register')}
          >
            🌱 Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <label htmlFor="auth-fullname">
              <span className="label-text">Họ và tên</span>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="auth-fullname"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          )}

          <label htmlFor="auth-email">
            <span className="label-text">Email</span>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                id="auth-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ban@example.com"
                autoComplete={mode === 'login' ? 'username' : 'email'}
                required
              />
            </div>
          </label>

          <label htmlFor="auth-password">
            <span className="label-text">Mật khẩu</span>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Tối thiểu 6 ký tự"
                minLength="6"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                className="input-toggle-password"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {status && (
            <div
              className={`auth-status auth-status-${statusType}`}
              role="alert"
              aria-live="assertive"
            >
              <span>{statusType === 'error' ? '⚠️' : '✅'}</span>
              <p>{status}</p>
            </div>
          )}

          <button
            className="btn btn-primary full-width auth-submit-btn"
            type="submit"
            id="auth-submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <span className="auth-loading">
                <span className="auth-spinner" aria-hidden="true" />
                Đang xử lý...
              </span>
            ) : mode === 'login' ? (
              '🔑 Đăng nhập'
            ) : (
              '🌱 Tạo tài khoản'
            )}
          </button>

          {mode === 'login' && (
            <p className="auth-switch-hint">
              Chưa có tài khoản?{' '}
              <button type="button" className="auth-link-btn" onClick={() => handleTabChange('register')}>
                Đăng ký ngay
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p className="auth-switch-hint">
              Đã có tài khoản?{' '}
              <button type="button" className="auth-link-btn" onClick={() => handleTabChange('login')}>
                Đăng nhập
              </button>
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
