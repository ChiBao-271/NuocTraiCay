'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { AuthModal } from '../../components/AuthModal.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { formatCurrency } from '../../services/productService.js';

export default function CartPage() {
  const { cartItems, cartTotal, changeQuantity, removeFromCart, clearCart, totalQuantity } = useCart();
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [voucher, setVoucher] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const router = useRouter();

  const SHIPPING_FEE = cartTotal >= 200000 ? 0 : 20000;
  const discount = voucherApplied ? Math.round(cartTotal * 0.1) : 0;
  const finalTotal = cartTotal + SHIPPING_FEE - discount;

  const handleApplyVoucher = () => {
    if (voucher.toUpperCase() === 'FREESHIP30' || voucher.toUpperCase() === 'FRESH10') {
      setVoucherApplied(true);
    } else {
      alert('Mã voucher không hợp lệ. Thử: FRESH10 hoặc FREESHIP30');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    router.push('/checkout');
  };

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

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
              <a href="/menu" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Xem Menu
              </a>
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
                    Mua thêm {formatCurrency(200000 - cartTotal)} để được miễn phí ship!
                  </p>
                )}
                {voucherApplied && (
                  <div className="cart-summary-row text-green">
                    <span>Giảm giá (voucher)</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
              </div>

              {/* Voucher input */}
              <div className="voucher-row">
                <span className="voucher-label">🎟️</span>
                <input
                  type="text"
                  placeholder="Nhập mã voucher"
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  disabled={voucherApplied}
                  className="voucher-input"
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={voucherApplied || !voucher}
                >
                  {voucherApplied ? '✓' : 'Áp dụng'}
                </button>
              </div>

              <div className="cart-total-row">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(finalTotal)}</strong>
              </div>

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

              <a href="/menu" className="btn btn-ghost full-width" style={{ marginTop: '0.75rem' }}>
                ← Tiếp tục mua sắm
              </a>
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026</span>
      </footer>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
