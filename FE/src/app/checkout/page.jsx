'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { AuthModal } from '../../components/AuthModal.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Link from 'next/link';
import { createOrder, createSePayCheckout, formatCurrency, getProductById } from '../../services/productService.js';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart, appliedVoucher, hydrateVoucher, replaceCartItems, isCartLoaded } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const orderSubmittedRef = useRef(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: '',
  });

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
    // CartProvider hydrates the signed-in user's cart from localStorage after
    // auth resolves. Before that, cartItems is temporarily empty; redirecting
    // during this window sends a valid checkout straight back to /menu.
    if (!user || !isCartLoaded) return;
    // A successful order intentionally clears the cart. Do not let this
    // checkout guard race the navigation to the receipt page.
    if (orderSubmittedRef.current) return;
    if (cartItems.length === 0) {
      router.replace('/menu');
    }
  }, [cartItems, user, isCartLoaded, router]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status) setStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }

    setSubmitting(true);
    const checkoutPayload = {
      customer: formData,
      items: cartItems,
      total: finalTotal,
      note: formData.note,
      voucherCode: appliedVoucher?.code || '',
    };
    const { data, error } = paymentMethod === 'sepay'
      ? await createSePayCheckout(checkoutPayload)
      : await createOrder(checkoutPayload);

    setSubmitting(false);
    if (error) {
      if (error.code === 'ORDER_TOTAL_CHANGED' && Number.isFinite(Number(error.recalculated_total))) {
        try {
          const refreshed = await Promise.all(cartItems.map(async (item) => {
            const result = await getProductById(item.id);
            return result?.data ? { ...item, ...result.data, quantity: item.quantity } : item;
          }));
          replaceCartItems(refreshed);
          const normalizedVoucher = hydrateVoucher(appliedVoucher?.code);
          const newSubtotal = refreshed.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
          const newBaseShipping = newSubtotal >= 200000 ? 0 : 20000;
          const newDiscount = normalizedVoucher?.type === 'percent' ? Math.round(newSubtotal * normalizedVoucher.value / 100) : 0;
          const newShippingDiscount = normalizedVoucher?.type === 'shipping' ? Math.min(newBaseShipping, normalizedVoucher.value) : 0;
          const newTotal = Math.max(0, newSubtotal + newBaseShipping - newDiscount - newShippingDiscount);
          setStatus(`Giá hoặc phí giao hàng vừa thay đổi. Giỏ đã cập nhật; tổng mới là ${formatCurrency(newTotal)}. Vui lòng kiểm tra lại rồi bấm đặt hàng lần nữa.`);
        } catch {
          setStatus(`Giá hoặc phí vừa thay đổi. Tổng mới từ máy chủ: ${formatCurrency(Number(error.recalculated_total))}. Hãy tải lại trang giỏ và xác nhận lại.`);
        }
        return;
      }
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
      subtotal: data.subtotal ?? cartTotal,
      shipping_fee: data.shipping_fee ?? SHIPPING_FEE,
      discount_amount: data.discount_amount ?? discount,
      voucher_code: appliedVoucher?.code || '',
      payment_method: paymentMethod,
      customer: formData,
      items: data.items?.map((item) => ({
        ...cartItems.find((cartItem) => cartItem.id === item.product_id),
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
      })) || cartItems,
    }));

    if (paymentMethod === 'sepay') {
      const checkout = data.sepay;
      if (!checkout?.action || checkout.method !== 'POST' || !checkout.fields || typeof checkout.fields !== 'object') {
        setStatus('Đơn đã được tạo nhưng chưa nhận được thông tin chuyển sang SePay. Vui lòng liên hệ cửa hàng trước khi đặt lại.');
        return;
      }
      orderSubmittedRef.current = true;
      clearCart();
      const paymentForm = document.createElement('form');
      paymentForm.method = checkout.method;
      paymentForm.action = checkout.action;
      paymentForm.style.display = 'none';
      for (const [name, value] of Object.entries(checkout.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value);
        paymentForm.appendChild(input);
      }
      document.body.appendChild(paymentForm);
      paymentForm.submit();
      return;
    }

    orderSubmittedRef.current = true;
    clearCart();
    router.push('/order-success');
  };

  const baseShipping = cartTotal >= 200000 ? 0 : 20000;
  const discount = appliedVoucher?.type === 'percent' ? Math.round(cartTotal * appliedVoucher.value / 100) : 0;
  const shippingDiscount = appliedVoucher?.type === 'shipping' ? Math.min(baseShipping, appliedVoucher.value) : 0;
  const SHIPPING_FEE = baseShipping - shippingDiscount;
  const voucherShippingDiscount = shippingDiscount;
  const finalTotal = Math.max(0, cartTotal + SHIPPING_FEE - discount);

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
          <h1>Thanh toán</h1>
          <p>Chúng tôi sẽ xác minh giá, tồn kho và phí giao hàng ở bước cuối.</p>
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

              <fieldset className="checkout-payment-options" disabled={submitting}>
                <legend>Phương thức thanh toán</legend>
                <label className={`checkout-payment-choice${paymentMethod === 'cod' ? ' is-selected' : ''}`}>
                  <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <span><strong>Thanh toán khi nhận hàng</strong><small>Trả tiền mặt khi đơn được giao</small></span>
                </label>
                <label className={`checkout-payment-choice${paymentMethod === 'sepay' ? ' is-selected' : ''}`}>
                  <input type="radio" name="paymentMethod" value="sepay" checked={paymentMethod === 'sepay'} onChange={() => setPaymentMethod('sepay')} />
                  <span><strong>Chuyển khoản ngân hàng qua SePay</strong><small>Thanh toán trực tuyến · Môi trường thử nghiệm</small></span>
                </label>
              </fieldset>

              {status && (
                <p className="form-status form-status-error">{status}</p>
              )}

              <button
                className="btn btn-primary full-width checkout-glow"
                type="submit"
                id="checkout-confirm-btn"
                disabled={submitting || cartItems.length === 0}
              >
                {submitting ? '⏳ Đang xử lý...' : `${paymentMethod === 'sepay' ? '🏦 Thanh toán qua SePay' : '🛍️ Đặt hàng'} · ${formatCurrency(finalTotal)}`}
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
                  {baseShipping === 0 ? 'Miễn phí 🎉' : formatCurrency(baseShipping)}
                </span>
              </div>
              {voucherShippingDiscount > 0 && <div className="cart-summary-row text-green"><span>Giảm phí vận chuyển ({appliedVoucher.code})</span><span>-{formatCurrency(voucherShippingDiscount)}</span></div>}
              {discount > 0 && <div className="cart-summary-row text-green"><span>Voucher {appliedVoucher.code}</span><span>-{formatCurrency(discount)}</span></div>}
            </div>

            <div className="cart-total-row">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(finalTotal)}</strong>
            </div>

            <p className="checkout-payment-note">{paymentMethod === 'sepay' ? '🏦 Bạn sẽ được chuyển tới SePay để thanh toán; đơn chỉ được xác nhận sau khi cửa hàng nhận thông báo thanh toán.' : '💵 Thanh toán khi nhận hàng (COD)'}</p>

            <Link href="/cart" className="btn btn-ghost full-width" style={{ marginTop: '0.5rem' }}>
              ← Quay lại giỏ hàng
            </Link>
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
