'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createOrder, formatCurrency } from '../services/productService.js';

export function CheckoutSection({ cartItems, cartTotal, onLoginClick, onClearCart }) {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: '',
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from localStorage when user logs in
  useEffect(() => {
    if (user) {
      const savedInfo = localStorage.getItem(`shipping_info_${user.id}`);
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          // Only auto-fill if we have data, leaving note out usually, but it's okay to restore all
          setFormData((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          // ignore
        }
      }
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    setStatus('');

    if (!user) {
      onLoginClick();
      return;
    }

    if (cartItems.length === 0) {
      setStatus('Giỏ hàng đang trống, hãy chọn sản phẩm trước.');
      setStatusType('error');
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
      console.error('Order creation error:', error);
      setStatus(`Không thể tạo đơn hàng: ${error.message || 'Lỗi hệ thống'}. Vui lòng thử lại.`);
      setStatusType('error');
      return;
    }

    // Save shipping info for next time
    localStorage.setItem(`shipping_info_${user.id}`, JSON.stringify({
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
    }));

    // Save order data for the success page
    const orderData = {
      id: data.id,
      created_at: data.created_at,
      total_amount: data.total_amount,
      customer: formData,
      items: cartItems,
    };
    sessionStorage.setItem('last_order', JSON.stringify(orderData));

    // Clear cart and redirect
    if (onClearCart) onClearCart();
    router.push('/order-success');
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Bạn';

  return (
    <section id="checkout" className="panel checkout-panel">
      <div className="panel-heading">
        <span className="eyebrow">Thanh toán</span>
        <h2>Thông tin giao hàng</h2>
      </div>

      {/* User profile mini */}
      <div className="notice profile-mini">
        <span className="avatar">{user ? '👤' : '🔒'}</span>
        <div>
          <strong>{user ? displayName : 'Chưa đăng nhập'}</strong>
          <small>
            {user
              ? user.email
              : 'Vui lòng đăng nhập để đặt hàng'}
          </small>
        </div>
      </div>

      {/* Gate: yêu cầu đăng nhập */}
      {!user && (
        <div className="checkout-login-gate">
          <p className="checkout-gate-msg">
            🔐 Bạn cần đăng nhập để tiến hành thanh toán và theo dõi đơn hàng.
          </p>
          <button
            className="btn btn-primary full-width"
            type="button"
            id="checkout-login-btn"
            onClick={onLoginClick}
          >
            Đăng nhập / Đăng ký
          </button>
        </div>
      )}

      <form className="checkout-form" onSubmit={handleCreateOrder}>
        <label htmlFor="checkout-fullname">
          Họ tên người nhận
          <input
            id="checkout-fullname"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            disabled={!user || submitting}
            required
          />
        </label>
        <label htmlFor="checkout-phone">
          Số điện thoại
          <input
            id="checkout-phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0901 234 567"
            disabled={!user || submitting}
            required
          />
        </label>
        <label htmlFor="checkout-address">
          Địa chỉ giao hàng
          <textarea
            id="checkout-address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            disabled={!user || submitting}
            required
          />
        </label>
        <label htmlFor="checkout-note">
          Ghi chú (không bắt buộc)
          <textarea
            id="checkout-note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Ví dụ: giao sau 17h, ít đá, không đường..."
            disabled={!user || submitting}
          />
        </label>

        {status && (
          <p className={`form-status ${statusType === 'error' ? 'form-status-error' : ''}`}>
            {status}
          </p>
        )}

        <button
          className="btn btn-primary full-width checkout-glow"
          type="submit"
          id="checkout-submit-btn"
          disabled={!user || cartTotal === 0 || submitting}
        >
          {submitting
            ? '⏳ Đang đặt hàng...'
            : user
            ? `🛍️ Đặt hàng${cartTotal > 0 ? ` · ${formatCurrency(cartTotal)}` : ''}`
            : '🔒 Đăng nhập để đặt hàng'}
        </button>
      </form>
    </section>
  );
}
