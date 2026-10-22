'use client';

import { useEffect, useState } from 'react';
import { fetchAdminDashboard, formatCurrency } from '../../services/productService.js';

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
  shipping: { label: 'Đang giao', color: '#8b5cf6' },
  delivered: { label: 'Đã giao', color: '#22c55e' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
};

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminDashboard().then(({ data, error: err }) => {
      if (err || !data) {
        // Nếu BE chưa kết nối, dùng demo data
        setStats(getDemoStats());
        setRecentOrders(getDemoOrders());
        setError('Không kết nối được BE, hiển thị dữ liệu mẫu.');
      } else {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-loading-spinner" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const pendingCount = recentOrders.filter((o) => o.order_status === 'pending').length;

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
          <div className="admin-alert-chip" style={{ background: '#fef3c7', color: '#92400e' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Stats */}
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
      </div>

      {/* Recent Orders */}
      <div className="admin-panel">
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
      </div>
    </div>
  );
}

/* ── Demo fallback khi BE chưa kết nối ──────────────────────── */
function getDemoStats() {
  return { totalOrders: 128, pendingOrders: 5, monthOrders: 34, monthRevenue: 8_500_000, totalCustomers: 97, totalProducts: 12 };
}

function getDemoOrders() {
  return [
    { id: '1', order_code: 'FS-0001', recipient_name: 'Nguyễn Văn A', total_amount: 285000, order_status: 'pending', created_at: new Date().toISOString() },
    { id: '2', order_code: 'FS-0002', recipient_name: 'Trần Thị B', total_amount: 159000, order_status: 'delivered', created_at: new Date().toISOString() },
    { id: '3', order_code: 'FS-0003', recipient_name: 'Lê Văn C', total_amount: 420000, order_status: 'shipping', created_at: new Date().toISOString() },
    { id: '4', order_code: 'FS-0004', recipient_name: 'Phạm Thị D', total_amount: 109000, order_status: 'confirmed', created_at: new Date().toISOString() },
    { id: '5', order_code: 'FS-0005', recipient_name: 'Hoàng Văn E', total_amount: 229000, order_status: 'cancelled', created_at: new Date().toISOString() },
  ];
}
