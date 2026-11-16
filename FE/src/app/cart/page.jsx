'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Link from 'next/link';
import { formatCurrency, validateVoucherCode } from '../../services/productService.js';

export default function CartPage() {
  const { cartItems, cartTotal, changeQuantity, removeFromCart, totalQuantity, appliedVoucher, applyVoucher, removeVoucher } = useCart();
  const { user } = useAuth();
  const [voucher, setVoucher] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const router = useRouter();

  const baseShipping = cartTotal >= 200000 ? 0 : 20000;
  const SHIPPING_FEE = Number.isFinite(appliedVoucher?.shippingFee)
    ? Number(appliedVoucher.shippingFee)
    : Math.max(0, baseShipping - (appliedVoucher?.type === 'shipping' ? Math.min(baseShipping, appliedVoucher.value) : 0));
  const discount = Number.isFinite(appliedVoucher?.discountAmount)
    ? Number(appliedVoucher.discountAmount)
    : appliedVoucher?.type === 'percent'
      ? Math.round(cartTotal * appliedVoucher.value / 100)
      : appliedVoucher?.type === 'fixed' ? Math.min(cartTotal, appliedVoucher.value) : 0;
  const voucherShippingDiscount = baseShipping - SHIPPING_FEE;
  const finalTotal = cartTotal + SHIPPING_FEE - discount;

  const handleApplyVoucher = async () => {
    const code = voucher.trim().toUpperCase();
    if (!code) return;
    setVoucherError('Đang kiểm tra mã…');
    const result = await validateVoucherCode(code, cartTotal);
    if (result.error) {
      setVoucherError(result.error.message || 'Mã giảm giá không dùng được cho đơn này.');
      return;
    }
    const data = result.data;
    const mappedType = data.discount_type === 'percentage' ? 'percent'
      : data.discount_type === 'freeship' ? 'shipping'
      : data.discount_type === 'fixed_amount' ? 'fixed' : 'percent';
    applyVoucher({
      code: data.code,
      type: mappedType,
      value: Number(data.discount_value || 0),
      discountAmount: Number(data.discountAmount || 0),
      shippingFee: Number(data.shippingFee || 0),
    });
    setVoucher(data.code);
    setVoucherError('');
  };

  const handleCheckout = () => {
    if (!user) {
      try { if (appliedVoucher) sessionStorage.setItem('checkout_voucher', appliedVoucher.code); } catch { /* session storage unavailable */ }
      router.push('/login?next=/checkout');
      return;
    }
    try { if (appliedVoucher) sessionStorage.setItem('checkout_voucher', appliedVoucher.code); } catch { /* session storage unavailable */ }
    router.push('/checkout');
  };

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header />

      <main className="page-main cart-page-layout">
        <h1 className="cart-v2-title">Giỏ Hàng Của Bạn 🛒</h1>

        {cartItems.length === 0 ? (
          <div className="panel cart-empty-panel">
            <div className="empty-state">
              <span style={{ fontSize: '4rem' }}>🛒</span>
              <h2>Giỏ hàng trống</h2>
              <p>Bạn chưa thêm sản phẩm nào. Hãy khám phá menu!</p>
              <Link href="/menu" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Xem Menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="cart-v2-grid">
            {/* Left: Items list */}
            <section className="cart-v2-items-panel">
              {cartItems.map((item) => (
                <div className="cart-v2-item" key={item.id}>
                  <div className="cart-v2-img" style={{ background: item.gradient }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} loading="lazy" />
                      : <span>{item.image}</span>}
                  </div>
                  <div className="cart-v2-info">
                    <strong className="cart-v2-name">{item.name}</strong>
                    <small className="cart-v2-desc">{item.description}</small>
                    <small className="cart-v2-unit">Dung tích: {item.unit}</small>
                  </div>
                  <div className="cart-v2-qty-block">
                    <button
                      type="button"
                      className="cart-v2-qty-btn"
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      aria-label="Giảm số lượng"
                    >−</button>
                    <span className="cart-v2-qty-num">{item.quantity}</span>
                    <button
                      type="button"
                      className="cart-v2-qty-btn"
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      aria-label="Tăng số lượng"
                    >+</button>
                  </div>
                  <div className="cart-v2-price-block">
                    <strong className="cart-v2-price">{formatCurrency(item.price * item.quantity)}</strong>
                    <small className="cart-v2-unit-price">{formatCurrency(item.price)} / ly</small>
                  </div>
                  <button
                    className="cart-v2-remove"
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Xóa ${item.name}`}
                  >🗑</button>
                </div>
              ))}
              <Link href="/menu" className="cart-v2-continue">← Tiếp tục mua sắm</Link>
            </section>

            {/* Right: Summary */}
            <section className="cart-v2-summary-panel">
              <h2 className="cart-v2-summary-title">Tóm tắt đơn hàng</h2>

              {/* Voucher */}
              <div className="cart-v2-voucher-row">
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá..."
                  value={voucher}
                  onChange={(e) => { setVoucher(e.target.value); setVoucherError(''); }}
                  disabled={Boolean(appliedVoucher)}
                  className="cart-v2-voucher-input"
                />
                <button
                  className="cart-v2-voucher-btn"
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={Boolean(appliedVoucher) || !voucher}
                >
                  {appliedVoucher ? '✓' : 'Áp Dụng'}
                </button>
              </div>
              {voucherError && <p className="form-status form-status-error" role="alert">{voucherError}</p>}
              {appliedVoucher && <p className="form-status form-status-success" role="status">Đã áp dụng {appliedVoucher.code}. <button className="text-button" type="button" onClick={() => { removeVoucher(); setVoucher(''); }}>Gỡ mã</button></p>}

              <div className="cart-v2-rows">
                <div className="cart-v2-row">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="cart-v2-row">
                  <span>Phí vận chuyển</span>
                  <span className={SHIPPING_FEE === 0 ? 'cart-v2-free' : ''}>
                    {SHIPPING_FEE === 0 ? 'Miễn phí' : formatCurrency(SHIPPING_FEE)}
                  </span>
                </div>
                {appliedVoucher?.type === 'percent' && discount > 0 && (
                  <div className="cart-v2-row cart-v2-discount-row">
                    <span>Giảm giá thành viên ({appliedVoucher.value}%)</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                {appliedVoucher?.type === 'shipping' && voucherShippingDiscount > 0 && (
                  <div className="cart-v2-row cart-v2-discount-row">
                    <span>Giảm phí vận chuyển ({appliedVoucher.code})</span>
                    <span>-{formatCurrency(voucherShippingDiscount)}</span>
                  </div>
                )}
              </div>

              <div className="cart-v2-total-row">
                <span>Tổng cộng</span>
                <strong className="cart-v2-total-amount">{formatCurrency(finalTotal)}</strong>
              </div>

              <button
                className="cart-v2-checkout-btn"
                type="button"
                id="proceed-checkout-btn"
                onClick={handleCheckout}
              >
                {user ? 'Tiến Hành Thanh Toán' : '🔒 Đăng nhập để đặt hàng'}
              </button>
              <p className="cart-v2-guarantee">Cam kết nguyên chất 100% tự nhiên • Ép lạnh tươi mới trong ngày</p>

            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
