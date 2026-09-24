'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { AuthModal } from '../../components/AuthModal.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { createOrder, formatCurrency } from '../../services/productService.js';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: '',
  });

  // Autofill from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`shipping_info_${user.id}`);
      if (saved) {
        try {
          setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
        } catch { /* ignore */ }
      }
    }
  }, [user]);

  // Redirect if not logged in or cart is empty
  useEffect(() => {
    if (!user) return; // wait for auth
    if (cartItems.length === 0) {
      router.replace('/menu');
    }
  }, [cartItems, user, router]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status) setStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }

    setSubmitting(true);
    const { data, error } = await createOrder({
      customer: formData,
      items: cartItems,
      total: cartTotal,
    });
    setSubmitting(false);

    if (error) {
      setStatus(`Lỗi: ${error.message}`);
      return;
    }

    // Save shipping info for next time
    localStorage.setItem(`shipping_info_${user.id}`, JSON.stringify({
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
    }));

    // Save for success page
    sessionStorage.setItem('last_order', JSON.stringify({
      id: data.id,
      order_code: data.order_code,
      created_at: data.created_at,
      total_amount: data.total_amount,
      customer: formData,
      items: cartItems,
    }));

    clearCart();
    router.push('/order-success');
  };

  const SHIPPING_FEE = cartTotal >= 200000 ? 0 : 20000;
  const finalTotal = cartTotal + SHIPPING_FEE;

  if (!user) {
    return (
      <div className="site-shell page-shell">
        <div className="ambient ambient-one" />
        <Header onLoginClick={() => setIsAuthOpen(true)} />
        <main className="page-main" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>🔒 Vui lòng đăng nhập để tiếp tục</h2>
          <button className="btn btn-primary" onClick={() => setIsAuthOpen(true)} style={{ marginTop: '1rem' }}>
            Đăng nhập / Đăng ký
          </button>
        </main>
        {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main checkout-page-layout">
        <div className="section-heading">
          <span className="eyebrow">Thanh toán</span>
          <h1>Xác nhận đặt hàng</h1>
        </div>

        <div className="checkout-page-grid">
          {/* Left: Form */}
          <section className="panel checkout-form-panel">
            <div className="notice profile-mini">
              <span className="avatar">👤</span>
              <div>
                <strong>{user.user_metadata?.full_name || user.email.split('@')[0]}</strong>
                <small>{user.email}</small>
              </div>
            </div>

            <h2>Thông tin giao hàng</h2>

            <form className="checkout-form" onSubmit={handleSubmit}>
              <label htmlFor="co-fullname">
                Họ tên người nhận
                <input
                  id="co-fullname"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  required
                  disabled={submitting}
                />
              </label>
              <label htmlFor="co-phone">
                Số điện thoại
                <input
                  id="co-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0901 234 567"
                  required
                  disabled={submitting}
                />
              </label>
              <label htmlFor="co-address">
                Địa chỉ giao hàng
                <textarea
                  id="co-address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  required
                  disabled={submitting}
                />
              </label>
              <label htmlFor="co-note">
                Ghi chú (không bắt buộc)
                <textarea
                  id="co-note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Ví dụ: giao sau 17h, ít đá..."
                  disabled={submitting}
                />
              </label>

              {status && (
                <p className="form-status form-status-error">{status}</p>
              )}

              <button
                className="btn btn-primary full-width checkout-glow"
                type="submit"
                id="checkout-confirm-btn"
                disabled={submitting || cartItems.length === 0}
              >
                {submitting ? '⏳ Đang xử lý...' : `🛍️ Đặt hàng · ${formatCurrency(finalTotal)}`}
              </button>
            </form>
          </section>

          {/* Right: Order summary */}
          <section className="panel checkout-summary-panel">
            <h2>Đơn hàng của bạn</h2>
            <div className="checkout-items-list">
              {cartItems.map((item) => (
                <div className="checkout-summary-item" key={item.id}>
                  <span className="checkout-item-icon">{item.image}</span>
                  <div className="checkout-item-info">
                    <strong>{item.name}</strong>
                    <small>x{item.quantity} · {formatCurrency(item.price)}/{item.unit}</small>
                  </div>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="checkout-summary-breakdown">
              <div className="cart-summary-row">
                <span>Tạm tính</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Phí giao hàng</span>
                <span className={SHIPPING_FEE === 0 ? 'text-green' : ''}>
                  {SHIPPING_FEE === 0 ? 'Miễn phí 🎉' : formatCurrency(SHIPPING_FEE)}
                </span>
              </div>
            </div>

            <div className="cart-total-row">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(finalTotal)}</strong>
            </div>

            <p className="checkout-payment-note">
              💳 Thanh toán khi nhận hàng (COD)
            </p>

            <a href="/cart" className="btn btn-ghost full-width" style={{ marginTop: '0.5rem' }}>
              ← Quay lại giỏ hàng
            </a>
          </section>
        </div>
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026</span>
      </footer>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
