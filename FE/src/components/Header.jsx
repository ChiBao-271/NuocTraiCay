'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { searchProductsSmart } from '../services/productService.js';

const NAV_LINKS = [
  { href: '/', label: 'Trang Chủ', exact: true },
  { href: '/rewards', label: 'Ưu Đãi' },
  { href: '/account', label: 'Tài khoản' },
];

function HeaderInner() {
  const { user, userRole, loading, signOut } = useAuth();
  const { totalQuantity } = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchWrap = useRef(null);

  useEffect(() => {
    const term = search.trim();
    if (!term) { setSuggestions([]); setSearchOpen(false); setSearchLoading(false); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      // Gợi ý ngay theo từng ký tự khách gõ, không phân biệt dấu ("xoai" → "Xoài").
      const matches = await searchProductsSmart(term, { limit: 6 });
      if (!active) return;
      setSuggestions(matches || []);
      setSearchOpen(true);
      setSearchLoading(false);
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    const closeOnOutside = (event) => { if (!searchWrap.current?.contains(event.target)) setSearchOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    rememberSearch(term);
    setSearchOpen(false);
    router.push(`/menu?search=${encodeURIComponent(term)}`);
  };

  const rememberSearch = (term) => {
    if (!user?.id || !term) return;
    try {
      const key = `recent_searches_${user.id}`;
      const previous = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [term, ...(Array.isArray(previous) ? previous.filter((value) => value.toLowerCase() !== term.toLowerCase()) : [])].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* browser storage unavailable */ }
  };

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
      <form className="header-search-wrap" ref={searchWrap} onSubmit={submitSearch} role="search">
        <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="header-search-input"
          placeholder="Tìm sản phẩm..."
          aria-label="Tìm kiếm sản phẩm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => { if (search.trim()) setSearchOpen(true); }}
          onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }}
          autoComplete="off"
        />
        {searchOpen && <div className="header-search-results" role="listbox" aria-label="Gợi ý sản phẩm">
          {searchLoading ? <div className="header-search-empty">Đang tìm sản phẩm…</div> : suggestions.length ? suggestions.map((product) => <Link key={product.id} href={`/product/${product.id}`} className="header-search-result" role="option" onClick={() => { rememberSearch(search.trim()); setSearchOpen(false); setSearch(''); }}><span className="header-search-result-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.image || '🍓'}</span><span className="header-search-result-copy"><strong>{product.name}</strong><small>{product.categoryName || product.category}</small></span><strong className="header-search-result-price">{new Intl.NumberFormat('vi-VN').format(product.price)}đ</strong></Link>) : <div className="header-search-empty">Không tìm thấy sản phẩm “{search.trim()}”.</div>}
          {!searchLoading && <button className="header-search-all" type="submit">Xem tất cả kết quả cho “{search.trim()}” ↗</button>}
        </div>}
      </form>

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
            {!loading && userRole === 'admin' && (
              <Link href="/admin" className="btn btn-primary header-admin-entry" aria-label="Vào trang quản trị" style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                ⚙️ Quản trị
              </Link>
            )}
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
