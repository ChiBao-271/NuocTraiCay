'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Wrapper bảo vệ route: chỉ admin mới được vào */
export function AdminShell({ children }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userRole && userRole !== 'admin') {
      router.replace('/');
    }
  }, [user, userRole, loading, router]);

  // Hiện loading khi chưa biết role
  if (loading || userRole === null) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-spinner" />
        <p>Đang xác thực...</p>
      </div>
    );
  }

  // Không phải admin → null (useEffect sẽ redirect)
  if (!user || userRole !== 'admin') return null;

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-content">
        <AdminTopBar />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/admin', icon: '📊', label: 'Tổng quan', exact: true },
  { href: '/admin/orders', icon: '📦', label: 'Quản lý đơn hàng' },
  { href: '/admin/products', icon: '🍊', label: 'Sản phẩm' },
  { href: '/admin/categories', icon: '🗂️', label: 'Danh mục' },
  { href: '/admin/users', icon: '👥', label: 'Tài khoản' },
  { href: '/admin/reports', icon: '📈', label: 'Báo cáo' },
];

function AdminSidebar() {
  const currentPath = usePathname() || '';

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <Link href="/admin" className="admin-brand">
        <span className="admin-brand-icon-v2">O</span>
        <div>
          <strong>Original Fruits</strong>
          <small>Không gian quản trị</small>
        </div>
      </Link>

      {/* Nav */}
      <nav className="admin-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Store status */}
      <div className="admin-store-status">
        <div className="admin-store-status-header">
          <span className="admin-store-dot" />
          <span>Cửa hàng đang mở</span>
        </div>
        <p>Mang vị tươi lành đến mỗi ngày.</p>
        <Link href="/" className="admin-store-link">Xem cửa hàng ↗</Link>
      </div>

      {/* Footer link */}
      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <span className="admin-nav-icon">⚙️</span>
          <span>Cài đặt</span>
        </Link>
      </div>
    </aside>
  );
}

function AdminTopBar() {
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0,2);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    setDateStr(new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now));
  }, []);

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <span className="admin-topbar-date">{dateStr}</span>
      </div>
      <div className="admin-topbar-right">
        <button className="admin-topbar-bell" aria-label="Thông báo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <div className="admin-topbar-user-info">
          <span className="admin-avatar admin-avatar-v2">{initials}</span>
          <div>
            <div className="admin-topbar-name">{displayName}</div>
            <div className="admin-topbar-role">Quản trị viên</div>
          </div>
        </div>
        <button className="btn btn-ghost admin-signout-btn" type="button" onClick={signOut}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
