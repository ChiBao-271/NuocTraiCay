import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createOrder, formatCurrency } from '../services/productService.js';

export function CheckoutSection({ cartItems, cartTotal, onLoginClick }) {
  const { user, isSupabaseConfigured } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: '',
  });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    setStatus('');

    if (!user) {
      setStatus('Vui lòng đăng nhập trước khi tạo đơn hàng.');
      return;
    }

    if (cartItems.length === 0) {
      setStatus('Giỏ hàng đang trống.');
      return;
    }

    setSubmitting(true);
    const { data, error } = await createOrder({
      customer: formData,
      items: cartItems,
      total: cartTotal,
      note: formData.note,
    });
    setSubmitting(false);

    if (error) {
      setStatus(error.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra Supabase policy.');
      return;
    }

    setStatus(`Đã tạo đơn hàng #${data.id.slice(0, 8)} với trạng thái ${data.status}.`);
  };

  return (
    <section id="checkout" className="panel checkout-panel">
      <div className="panel-heading">
        <span className="eyebrow">Profile & Checkout</span>
        <h2>Thông tin giao hàng</h2>
      </div>

      <div className="notice profile-mini">
        <span className="avatar">👤</span>
        <div>
          <strong>{user ? 'Maya Citrus' : 'Khách vãng lai'}</strong>
          <small>{user ? user.email : 'Đăng nhập để đặt nước ép nhanh hơn'}</small>
        </div>
      </div>

      <div className="notice">
        <strong>{isSupabaseConfigured ? 'Supabase đã sẵn sàng' : 'Chế độ demo'}</strong>
        <span>
          {isSupabaseConfigured
            ? 'Form đăng nhập/đăng ký đang dùng Supabase Auth.'
            : 'Thêm URL và anon key vào file .env để bật Supabase Auth.'}
        </span>
      </div>

      {!user && (
        <button className="btn btn-primary full-width" type="button" onClick={onLoginClick}>
          Đăng nhập hoặc đăng ký để đặt hàng
        </button>
      )}

      <div className="search-preview"><span>⌕</span><input type="search" placeholder="Search for fresh juice" disabled={!user} /></div>

      <form className="checkout-form" onSubmit={handleCreateOrder}>
        <label>
          Họ tên người nhận
          <input
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            disabled={!user}
            required
          />
        </label>
        <label>
          Số điện thoại
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0901234567"
            disabled={!user}
            required
          />
        </label>
        <label>
          Địa chỉ giao hàng
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, phường/xã, quận/huyện"
            disabled={!user}
            required
          />
        </label>
        <label>
          Ghi chú
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Ví dụ: giao sau 17h, ít đá..."
            disabled={!user}
          />
        </label>
        {status && <p className="form-status">{status}</p>}
        <button className="btn btn-primary full-width" type="submit" disabled={!user || cartTotal === 0 || submitting}>
          {submitting ? 'Đang tạo đơn...' : `Tạo đơn hàng ${cartTotal > 0 ? `(${formatCurrency(cartTotal)})` : ''}`}
        </button>
      </form>
    </section>
  );
}

