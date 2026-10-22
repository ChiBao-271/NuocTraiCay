'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext.jsx';

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
  { href: '/admin', icon: '📊', label: 'Dashboard', exact: true },
  { href: '/admin/orders', icon: '📦', label: 'Đơn hàng' },
  { href: '/admin/products', icon: '🍊', label: 'Sản phẩm' },
  { href: '/admin/customers', icon: '👥', label: 'Khách hàng' },
  { href: '/admin/categories', icon: '🗂️', label: 'Danh mục' },
  { href: '/admin/reports', icon: '📈', label: 'Báo cáo' },
];

function AdminSidebar() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <a href="/admin" className="admin-brand">
        <span className="admin-brand-icon">🧃</span>
        <div>
          <strong>FreshFruit</strong>
          <small>Admin Panel</small>
        </div>
      </a>

      {/* Nav */}
      <nav className="admin-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`admin-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer link */}
      <div className="admin-sidebar-footer">
        <a href="/" className="admin-nav-item">
          <span className="admin-nav-icon">🏠</span>
          <span>Về trang chủ</span>
        </a>
      </div>
    </aside>
  );
}

function AdminTopBar() {
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <span className="admin-topbar-badge">🔐 Quản trị viên</span>
      </div>
      <div className="admin-topbar-right">
        <span className="admin-topbar-user">
          <span className="admin-avatar">{displayName[0]?.toUpperCase()}</span>
          {displayName}
        </span>
        <button className="btn btn-ghost admin-signout-btn" type="button" onClick={signOut}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
