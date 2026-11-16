'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAdminDashboard, formatCurrency } from '../../services/productService.js';

/* ── Thẻ số liệu & tiêu đề khối ─────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="admin-stat-card" style={{ '--card-accent': color }}>
      <div className="admin-stat-icon">{icon}</div>
      <div className="admin-stat-body">
        <p className="admin-stat-label">{label}</p>
        <strong className="admin-stat-value">{value ?? '—'}</strong>
        {sub && <small className="admin-stat-sub">{sub}</small>}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div className="admin-section-header">
      <span>{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

const STATUS_LABELS = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận', color: '#3b82f6' },
  preparing: { label: 'Đang chuẩn bị', color: '#ec4899' },
  shipping: { label: 'Đang giao', color: '#8b5cf6' },
  completed: { label: 'Hoàn tất', color: '#22c55e' },
  delivered: { label: 'Đã giao', color: '#22c55e' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  failed: { label: 'Thất bại', color: '#ef4444' },
};

const QUICK_LINKS = [
  { href: '/admin/orders', label: 'Quản lý đơn hàng', icon: '📦' },
  { href: '/admin/products', label: 'Sản phẩm', icon: '🍊' },
  { href: '/admin/categories', label: 'Danh mục', icon: '🗂️' },
  { href: '/admin/users', label: 'Tài khoản', icon: '👥' },
  { href: '/admin/reports', label: 'Báo cáo', icon: '📈' },
];

/* ── Trang tổng quan ────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminDashboard().then(({ data, error: err }) => {
      if (!active) return;
      if (err || !data) {
        setStats(null);
        setRecentOrders([]);
        setError(err?.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
      } else {
        setStats(data.stats);
        setRecentOrders(data.recentOrders ?? []);
        setError(null);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-loading-spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const pendingCount = stats?.pendingOrders ?? 0;

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">📊 Tổng quan</span>
          <h1>Dashboard</h1>
          <p>Xin chào! Dưới đây là tình hình hôm nay.</p>
        </div>
        {pendingCount > 0 && (
          <Link href="/admin/orders" className="admin-alert-chip">
            ⚠️ {pendingCount} đơn chờ xử lý
          </Link>
        )}
      </div>

      {error && (
        <div className="admin-orders-error" role="alert" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>⚠️ {error}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>Thử tải lại</button>
        </div>
      )}

      {!error && (
        <div className="admin-stats-grid">
          <StatCard
            icon="💰"
            label="Doanh thu tháng này"
            value={formatCurrency(stats?.monthRevenue ?? 0)}
            sub={`${stats?.monthOrders ?? 0} đơn hàng`}
            color="#22c55e"
          />
          <StatCard
            icon="📦"
            label="Tổng đơn hàng"
            value={stats?.totalOrders ?? 0}
            sub={`${pendingCount} chờ xử lý`}
            color="#3b82f6"
          />
          <StatCard
            icon="👥"
            label="Khách hàng"
            value={stats?.totalCustomers ?? 0}
            sub="Tổng tài khoản"
            color="#8b5cf6"
          />
          <StatCard
            icon="🍊"
            label="Sản phẩm"
            value={stats?.totalProducts ?? 0}
            sub="Đang kinh doanh"
            color="#f59e0b"
          />
        </div>
      )}

      {!error && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <SectionHeader title="Đơn hàng gần đây" icon="📦" />
            <Link href="/admin/orders" className="btn btn-ghost">Xem tất cả →</Link>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const st = STATUS_LABELS[order.order_status] ?? { label: order.order_status, color: '#888' };
                    return (
                      <tr key={order.id}>
                        <td>
                          <code className="admin-order-code">
                            {order.order_code || `#${String(order.id).slice(0, 8).toUpperCase()}`}
                          </code>
                        </td>
                        <td>{order.recipient_name || '—'}</td>
                        <td><strong>{formatCurrency(order.total_amount ?? 0)}</strong></td>
                        <td>
                          <span className="admin-status-chip" style={{ '--chip-color': st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td>
                          <small>{order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : '—'}</small>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <SectionHeader title="Truy cập nhanh" icon="⚡" />
        </div>
        <div className="admin-product-actions" style={{ padding: '0 1.2rem 1.2rem', flexWrap: 'wrap' }}>
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} className="btn btn-ghost" href={item.href}>{item.icon} {item.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
