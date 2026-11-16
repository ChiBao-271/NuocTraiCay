'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAdminCatalogHealth, fetchAdminDashboard, formatCurrency } from '../../services/productService.js';

/* ── Skeleton & helpers ─────────────────────────────────────── */
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
  preparing: { label: 'Đang chuẩn bị', color: '#ec4899' },
  delivered: { label: 'Đã giao', color: '#22c55e' },
  completed: { label: 'Hoàn tất', color: '#22c55e' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
};

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogHealth, setCatalogHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminDashboard(), fetchAdminCatalogHealth()]).then(([dashboard, health]) => {
      if (!active) return;
      const { data, error: err } = dashboard;
      if (err || !data) {
        setStats(null);
        setRecentOrders([]);
        setError(err?.message || 'Không tải được dữ liệu quản trị từ backend.');
      } else {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
      }
      setCatalogHealth(health.data);
      setHealthError(health.error?.message || '');
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
      {/* Welcome */}
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">📊 Tổng quan</span>
          <h1>Dashboard</h1>
          <p>Xin chào! Dưới đây là tình hình hôm nay.</p>
        </div>
        {pendingCount > 0 && (
          <div className="admin-alert-chip">
            ⚠️ {pendingCount} đơn chờ xử lý
          </div>
        )}
        {error && (
          <div className="admin-alert-chip" role="alert" style={{ background: '#fef3c7', color: '#92400e' }}>
            <span>⚠️ {error}</span>
            <button type="button" className="btn btn-ghost" onClick={() => { setLoading(true); setError(null); setReloadKey((value) => value + 1); }}>Thử tải lại</button>
          </div>
        )}
      </div>
      {healthError && <section className="admin-panel"><div className="admin-orders-error" role="alert">Tình trạng database chưa tải được: {healthError}</div><p>Backend API chưa có route/SQL health mới hoặc Supabase project Render chưa khớp. Mở Render logs và kiểm tra biến SUPABASE_URL/Service Role (không chia sẻ giá trị key).</p><p>Admin chỉ hiện dữ liệu thật; không dùng số liệu demo thay cho lỗi kết nối.</p></section>}
      {catalogHealth && <section className="admin-panel" aria-label="Chẩn đoán dữ liệu catalog">
        <div className="admin-panel-head"><SectionHeader title="Dữ liệu thật đang đọc từ Supabase" icon="🗄️" /></div>
        <p style={{ margin: '0 1.2rem 1rem', color: '#66715f', fontSize: '.85rem' }}>Backend: <code>{catalogHealth.backendSupabaseHost || 'không xác định'}</code>. Kiểm tra host này có trùng Supabase project nơi bạn xem dữ liệu không.</p>
        <div className="admin-stats-grid">
          <StatCard icon="👤" label="Auth Users" value={catalogHealth.counts?.authUsers ?? '—'} sub={`profiles: ${catalogHealth.counts?.profiles ?? '—'}`} color="#8b5cf6" />
          <StatCard icon="🍊" label="Sản phẩm" value={catalogHealth.counts?.products ?? '—'} sub={`Đang bán: ${catalogHealth.counts?.availableProducts ?? '—'}`} color="#f59e0b" />
          <StatCard icon="🗂️" label="Danh mục" value={catalogHealth.counts?.categories ?? '—'} sub={`Đang hiện: ${catalogHealth.counts?.activeCategories ?? '—'}`} color="#22c55e" />
          <StatCard icon="⚠️" label="Sản phẩm thiếu danh mục" value={catalogHealth.counts?.uncategorizedProducts ?? '—'} sub="category_id IS NULL" color="#ef4444" />
        </div>
        {(catalogHealth.missingProductColumns?.length > 0 || catalogHealth.missingCategoryColumns?.length > 0) && <div className="admin-orders-error" role="alert">Thiếu cột schema — products: {catalogHealth.missingProductColumns?.join(', ') || 'không thiếu'}; categories: {catalogHealth.missingCategoryColumns?.join(', ') || 'không thiếu'}.</div>}
        <div className="admin-product-actions"><Link className="btn btn-ghost" href="/admin/users">Mở tài khoản</Link><Link className="btn btn-ghost" href="/admin/products">Mở sản phẩm</Link><Link className="btn btn-ghost" href="/admin/categories">Mở danh mục</Link></div>
      </section>}

      {/* Stats */}
      {!error && <div className="admin-stats-grid">
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
          sub={`${stats?.pendingOrders ?? 0} chờ xử lý`}
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
      </div>}

      {/* Recent Orders */}
      {!error && <div className="admin-panel">
        <div className="admin-panel-head">
          <SectionHeader title="Đơn hàng gần đây" icon="📦" />
          <a href="/admin/orders" className="btn btn-ghost">Xem tất cả →</a>
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
                        <span
                          className="admin-status-chip"
                          style={{ '--chip-color': st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <small>{new Date(order.created_at).toLocaleDateString('vi-VN')}</small>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
