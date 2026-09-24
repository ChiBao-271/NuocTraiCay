'use client';

import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';

export function Header({ onLoginClick }) {
  const { user, signOut } = useAuth();
  const { totalQuantity } = useCart();

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <header className="header">
      <a href="/" className="brand" aria-label="FreshFruit Shop">
        <span className="brand-icon">🧃</span>
        <span>
          <strong>Fresh Web</strong>
          <small>Juice shop &amp; rewards</small>
        </span>
      </a>

      <nav className="nav-links" aria-label="Điều hướng chính">
        <a href="/">Trang chủ</a>
        <a href="/menu">Menu</a>
        <a href="/rewards">Ưu đãi</a>
        <a href="/cart">Giỏ hàng</a>
        <a href="/account">Tài khoản</a>
      </nav>

      <div className="header-actions">
        <a href="/cart" className="cart-chip" aria-label={`Giỏ hàng (${totalQuantity} sản phẩm)`}>
          <span>🛒</span>
          {totalQuantity > 0 && (
            <span className="cart-badge">{totalQuantity}</span>
          )}
        </a>

        {user ? (
          <div className="header-user">
            <span className="header-user-name">
              👋 {displayName}
            </span>
            <button className="btn btn-ghost" type="button" onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" type="button" onClick={onLoginClick}>
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
