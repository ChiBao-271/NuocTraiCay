'use client';

import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Trang Chủ', exact: true },
  { href: '/rewards', label: 'Ưu Đãi' },
  { href: '/contact', label: 'Liên Hệ' },
];

function HeaderInner() {
  const { user, signOut } = useAuth();
  const { totalQuantity } = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Maya Citrus';

  const shortName = displayName.split(' ').pop();
  const initials = shortName.charAt(0).toUpperCase();

  function isLinkActive(href) {
    const [path, query] = href.split('?');
    if (href === '/') return pathname === '/';
    if (!pathname.startsWith(path)) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [key, val] of params.entries()) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  }

  return (
    <header className="header-v2">
      {/* Brand */}
      <Link href="/" className="brand-v2" aria-label="Original Fruits">
        <span className="brand-icon-v2">O</span>
        <span className="brand-text-v2">Original Fruits</span>
      </Link>

      {/* Nav */}
      <nav className="nav-links-v2" aria-label="Điều hướng chính">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link-v2 ${isLinkActive(href) ? 'nav-active-v2' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Search bar */}
      <div className="header-search-wrap">
        <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="header-search-input"
          placeholder="Tìm kiếm nước ép..."
          aria-label="Tìm kiếm sản phẩm"
        />
      </div>

      {/* Actions */}
      <div className="header-actions-v2">
        {/* Cart */}
        <Link href="/cart" className="header-cart-v2" aria-label={`Giỏ hàng (${totalQuantity} sản phẩm)`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {totalQuantity > 0 && (
            <span className="cart-badge-v2">{totalQuantity}</span>
          )}
        </Link>

        {/* User / Auth */}
        {user ? (
          <div className="header-user-v2">
            <div className="header-avatar-v2" title={displayName}>
              {initials}
            </div>
            <span className="header-username-v2">{shortName}</span>
            <button className="btn btn-ghost header-signout-v2" type="button" onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary header-login-v2" id="header-login-btn">
            Đăng nhập
          </Link>
        )}

        {/* Bell */}
        <Link href="/notifications" className="header-bell-v2" aria-label="Thông báo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </Link>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={
      <header className="header-v2">
        <Link href="/" className="brand-v2"><span className="brand-icon-v2">O</span><span className="brand-text-v2">Original Fruits</span></Link>
      </header>
    }>
      <HeaderInner />
    </Suspense>
  );
}
