'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../services/productService.js';

/** Inline "added to cart" banner that auto-hides */
function CartAddedBanner({ lastAdded }) {
  const [visible, setVisible] = useState(false);
  const prevId = useRef(null);

  useEffect(() => {
    if (!lastAdded || lastAdded.id === prevId.current) return;
    prevId.current = lastAdded.id;

    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  if (!lastAdded) return null;

  return (
    <div className={`cart-added-banner ${visible ? 'cart-added-visible' : ''}`} aria-live="polite">
      <span className="cart-added-icon">{lastAdded.image}</span>
      <div>
        <strong>Đã thêm vào giỏ!</strong>
        <small>{lastAdded.name}</small>
      </div>
      <span className="cart-added-check">✓</span>
    </div>
  );
}

export function CartPanel({ items, total, onChangeQuantity, lastAdded }) {
  return (
    <section id="cart" className="panel cart-panel">
      <div className="panel-heading">
        <span className="eyebrow">🛒 My Cart</span>
        <h2>Giỏ hàng của bạn</h2>
      </div>

      {/* Success banner when item is added */}
      <CartAddedBanner lastAdded={lastAdded} />

      {items.length === 0 ? (
        <div className="empty-state">
          <span>🛒</span>
          <p>Giỏ hàng đang trống. Hãy chọn nước ép hoặc trái cây yêu thích bên dưới.</p>
        </div>
      ) : (
        <div className="cart-list">
          {items.map((item) => (
            <div className="cart-item" key={item.id}>
              <span className="cart-item-icon">{item.image}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{formatCurrency(item.price)} / {item.unit}</small>
              </div>
              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                  aria-label={`Giảm ${item.name}`}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                  aria-label={`Tăng ${item.name}`}
                >
                  +
                </button>
              </div>
              <span className="cart-item-subtotal">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="cart-total">
        <span>Tổng cộng</span>
        <strong>{formatCurrency(total)}</strong>
      </div>

      <div className="coupon-line">
        <span>🎟 FREESHIP30</span>
        <button type="button">Áp dụng</button>
      </div>

      <button
        className="btn btn-primary full-width checkout-glow"
        type="button"
        disabled={items.length === 0}
        onClick={() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })}
        id="cart-checkout-btn"
      >
        {items.length === 0 ? '🛒 Giỏ hàng trống' : `💳 Tiến hành thanh toán (${items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)`}
      </button>
    </section>
  );
}
