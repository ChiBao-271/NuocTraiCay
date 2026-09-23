import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export function AuthModal({ onClose }) {
  const { signIn, signUp, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');

    const action = mode === 'login' ? signIn : signUp;
    const { error } = await action(formData);

    setSubmitting(false);

    if (error) {
      setStatus(error.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      return;
    }

    setStatus(
      mode === 'login'
        ? 'Đăng nhập thành công.'
        : 'Đăng ký thành công. Nếu Supabase bật xác thực email, hãy kiểm tra hộp thư.',
    );

    window.setTimeout(onClose, 800);
  };

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

        <div className="auth-hero-art">
          <span>🍊</span><span>🥝</span><span>🍓</span><span>✨</span>
        </div>

        <div className="panel-heading">
          <span className="eyebrow">Tài khoản</span>
          <h2 id="auth-title">{mode === 'login' ? 'Welcome Back!' : 'Create Account'}</h2>
          <p>
            {isSupabaseConfigured
              ? 'Tài khoản sẽ được xử lý bằng Supabase Auth.'
              : 'Chưa có API key nên form đang chạy demo local.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            Đăng nhập
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Họ tên
              <input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ban@example.com"
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Tối thiểu 6 ký tự"
              minLength="6"
              required
            />
          </label>

          {status && <p className="form-status">{status}</p>}

          <button className="btn btn-primary full-width" type="submit" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>
      </section>
    </div>
  );
}

