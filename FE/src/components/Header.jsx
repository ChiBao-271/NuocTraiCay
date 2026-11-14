'use client';

import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/menu?cat=fresh-fruit', label: 'Trái Cây Tươi' },
  { href: '/menu?cat=juice', label: 'Nước Ép' },
  { href: '/rewards', label: 'Ưu Đãi' },
];

export function Header() {
  const { user, signOut } = useAuth();
  const { totalQuantity } = useCart();
  const pathname = usePathname();

  const displayName =
    user?.user_metadata?.full_name?.split(' ').pop() ||
    user?.email?.split('@')[0] ||
    '';

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="header">
      {/* Brand */}
      <Link href="/" className="brand" aria-label="Original Fruits">
        <span className="brand-icon">🍊</span>
        <span>
          <strong>Original Fruits</strong>
          <small>Juice shop &amp; rewards</small>
        </span>
      </Link>

      {/* Nav */}
      <nav className="nav-links" aria-label="Điều hướng chính">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname?.startsWith(href.split('?')[0]);
          return (
            <Link
              key={href}
              href={href}
              className={isActive ? 'nav-active' : ''}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="header-actions">
        {/* Search icon */}
        <button className="header-icon-btn" type="button" aria-label="Tìm kiếm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Cart */}
        <Link href="/cart" className="cart-chip" aria-label={`Giỏ hàng (${totalQuantity} sản phẩm)`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {totalQuantity > 0 && (
            <span className="cart-badge">{totalQuantity}</span>
          )}
        </Link>

        {/* Auth */}
        {user ? (
          <div className="header-user">
            <div className="header-avatar" title={displayName}>
              {initials}
            </div>
            <span className="header-user-name">{displayName}</span>
            <button className="btn btn-ghost" type="button" onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary" id="header-login-btn">
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
