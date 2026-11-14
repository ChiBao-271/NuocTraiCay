'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Link from 'next/link';
import { formatCurrency } from '../../services/productService.js';

export default function CartPage() {
  const { cartItems, cartTotal, changeQuantity, removeFromCart, clearCart, totalQuantity, appliedVoucher, applyVoucher, removeVoucher, replaceCartItems } = useCart();
  const { user } = useAuth();
  const [voucher, setVoucher] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const router = useRouter();

  const baseShipping = cartTotal >= 200000 ? 0 : 20000;
  const SHIPPING_FEE = Math.max(0, baseShipping - (appliedVoucher?.type === 'shipping' ? Math.min(baseShipping, appliedVoucher.value) : 0));
  const discount = appliedVoucher?.type === 'percent' ? Math.round(cartTotal * appliedVoucher.value / 100) : 0;
  const voucherShippingDiscount = baseShipping - SHIPPING_FEE;
  const finalTotal = cartTotal + SHIPPING_FEE - discount;

  const handleApplyVoucher = () => {
    const code = voucher.trim().toUpperCase();
    const vouchers = { FRESH10: { code, type: 'percent', value: 10 }, FREESHIP30: { code, type: 'shipping', value: 30000 } };
    if (vouchers[code]) {
      applyVoucher(vouchers[code]);
      setVoucher(code);
      setVoucherError('');
    } else {
      setVoucherError('Mã voucher không hợp lệ. Thử FRESH10 hoặc FREESHIP30.');
    }
  };

  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState('');
  const handleRefreshCart = async () => {
    setReconciling(true); setReconcileMessage('');
    try {
      const refreshed = await Promise.all(cartItems.map(async (item) => {
        const { getProductById } = await import('../../services/productService.js');
        const result = await getProductById(item.id);
        return result?.data ? { ...item, ...result.data, quantity: item.quantity } : item;
      }));
      replaceCartItems(refreshed);
      setReconcileMessage('Giá và tồn kho đã được làm mới từ catalog hiện tại.');
    } finally { setReconciling(false); }
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
        <div className="cart-page-heading">
          <span className="eyebrow">🛒 My Cart</span>
          <h1>Giỏ hàng của bạn</h1>
          {cartItems.length > 0 && (
            <button className="btn btn-ghost" type="button" onClick={clearCart}>
              Xóa tất cả
            </button>
          )}
        </div>

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
          <div className="cart-page-grid">
            {/* Left: Items list */}
            <section className="panel cart-items-panel">
              <h2>Sản phẩm ({totalQuantity})</h2>
              <div className="cart-list">
                {cartItems.map((item) => (
                  <div className="cart-item cart-item-detailed" key={item.id}>
                    <div
                      className="cart-item-visual"
                      style={{ background: item.gradient }}
                    >
                      <span>{item.image}</span>
                    </div>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <small>{formatCurrency(item.price)} / {item.unit}</small>
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, item.quantity - 1)}
                          aria-label="Giảm số lượng"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, item.quantity + 1)}
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-right">
                      <strong className="cart-item-total">
                        {formatCurrency(item.price * item.quantity)}
                      </strong>
                      <button
                        className="cart-remove-btn"
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Xóa ${item.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Right: Summary */}
            <section className="panel cart-summary-panel">
              <h2>Tóm tắt đơn hàng</h2>

              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>Tạm tính ({totalQuantity} sản phẩm)</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="cart-summary-row">
                  <span>Phí giao hàng</span>
                  <span className={SHIPPING_FEE === 0 ? 'text-green' : ''}>
                    {SHIPPING_FEE === 0 ? 'Miễn phí 🎉' : formatCurrency(SHIPPING_FEE)}
                  </span>
                </div>
                {SHIPPING_FEE > 0 && (
                  <p className="cart-shipping-hint">
                    {cartTotal < 200000 && <>Mua thêm {formatCurrency(200000 - cartTotal)} để được miễn phí ship!</>}
                  </p>
                )}
                {appliedVoucher?.type === 'percent' && discount > 0 && (
                  <div className="cart-summary-row text-green">
                    <span>Giảm giá ({appliedVoucher?.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                {appliedVoucher?.type === 'shipping' && voucherShippingDiscount > 0 && <div className="cart-summary-row text-green"><span>Giảm phí vận chuyển ({appliedVoucher.code})</span><span>-{formatCurrency(voucherShippingDiscount)}</span></div>}
              </div>

              {/* Voucher input */}
              <div className="voucher-row">
                <span className="voucher-label">🎟️</span>
                <input
                  type="text"
                  placeholder="Nhập mã voucher"
                  value={voucher}
                  onChange={(e) => { setVoucher(e.target.value); setVoucherError(''); }}
                  disabled={Boolean(appliedVoucher)}
                  className="voucher-input"
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={Boolean(appliedVoucher) || !voucher}
                >
                  {appliedVoucher ? '✓' : 'Áp dụng'}
                </button>
              </div>
              {voucherError && <p className="form-status form-status-error" role="alert">{voucherError}</p>}
              {appliedVoucher && <p className="form-status form-status-success" role="status">Đã áp dụng {appliedVoucher.code}. <button className="text-button" type="button" onClick={() => { removeVoucher(); setVoucher(''); }}>Gỡ mã</button></p>}

              <div className="cart-total-row">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(finalTotal)}</strong>
              </div>
              <button className="btn btn-ghost full-width" type="button" disabled={reconciling || cartItems.length === 0} onClick={handleRefreshCart}>{reconciling ? 'Đang đồng bộ giá…' : 'Đồng bộ giá và tồn kho'}</button>
              {reconcileMessage && <p className="form-status form-status-success" role="status">{reconcileMessage}</p>}

              <button
                className="btn btn-primary full-width checkout-glow"
                type="button"
                id="proceed-checkout-btn"
                onClick={handleCheckout}
              >
                {user
                  ? `🛍️ Tiến hành đặt hàng · ${formatCurrency(finalTotal)}`
                  : '🔒 Đăng nhập để đặt hàng'}
              </button>

              <Link href="/menu" className="btn btn-ghost full-width" style={{ marginTop: '0.75rem' }}>
                ← Tiếp tục mua sắm
              </Link>
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
