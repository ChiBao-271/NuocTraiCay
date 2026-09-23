import { useAuth } from '../contexts/AuthContext.jsx';

export function Header({ cartQuantity, onLoginClick }) {
  const { user, signOut } = useAuth();

  return (
    <header className="header">
      <a href="#top" className="brand" aria-label="FreshFruit Shop">
        <span className="brand-icon">🧃</span>
        <span>
          <strong>Fresh Web</strong>
          <small>Juice shop & rewards</small>
        </span>
      </a>

      <nav className="nav-links" aria-label="Điều hướng chính">
        <a href="/">Trang chủ</a>
        <a href="/#products">Menu</a>
        <a href="/rewards">Ưu đãi</a>
        <a href="/account">Tài khoản</a>
        <a href="/#cart">Giỏ hàng</a>
      </nav>

      <div className="header-actions">
        <span className="cart-chip"><span>🛒</span> {cartQuantity}</span>
        {user ? (
          <div className="header-user">
            <span className="header-user-name">
              👋 {user.user_metadata?.full_name || user.email.split('@')[0]}
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

