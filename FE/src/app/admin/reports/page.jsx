'use client';

import { useEffect, useState } from 'react';
import { fetchAdminDashboard, fetchAdminOrders, formatCurrency } from '../../../services/productService.js';

const ORDER_STATUS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  completed: 'Hoàn tất',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  failed: 'Thất bại',
};

const PAYMENT_STATUS = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
  pending: 'Đang xử lý',
};

const statusText = (value) => ORDER_STATUS[value] || value || '—';
const paymentText = (value) => PAYMENT_STATUS[value] || value || '—';

export default function AdminReportsPage() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchAdminDashboard(), fetchAdminOrders({ page, limit: 20, status: 'all' })]).then(([d, o]) => {
      if (!active) return;
      if (d.error || o.error) setError(d.error?.message || o.error?.message || 'Không tải được báo cáo.');
      else setError('');
      setStats(d.data?.stats || null);
      setOrders(o.data || []);
      setTotal(o.total || 0);
      setTotalPages(Math.max(1, o.totalPages || 1));
      setLoading(false);
    });
    return () => { active = false; };
  }, [page]);

  const csv = () => {
    const rows = [
      ['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Thanh toán', 'Trạng thái', 'Ngày đặt'],
      ...orders.map((o) => [o.order_code, o.recipient_name, o.total_amount, paymentText(o.payment_status), statusText(o.order_status), o.created_at]),
    ];
    const content = '\ufeff' + rows.map((row) => row.map((v) => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bao-cao-don-hang.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    ['Doanh thu tháng này', formatCurrency(stats?.monthRevenue || 0), `Đã thu: ${formatCurrency(stats?.monthPaidRevenue || 0)}`],
    ['Đơn hàng tháng này', stats?.monthOrders || 0, 'Tính cả đơn chưa thanh toán'],
    ['Tổng đơn hàng', stats?.totalOrders || 0, `${stats?.pendingOrders || 0} đơn chờ xử lý`],
    ['Khách hàng', stats?.totalCustomers || 0, 'Tổng tài khoản khách'],
  ];

  return (
    <section className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">📈 Thống kê</span>
          <h1>Báo cáo</h1>
          <p>Tổng hợp doanh thu và {total} đơn hàng.</p>
        </div>
        <button className="btn btn-primary" onClick={csv} disabled={!orders.length}>Tải CSV trang này</button>
      </div>

      {error && <div className="admin-orders-error" role="alert">{error}</div>}

      <div className="admin-stats-grid">
        {cards.map(([label, value, sub]) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-body">
              <p className="admin-stat-label">{label}</p>
              <strong className="admin-stat-value">{value}</strong>
              {sub && <small className="admin-stat-sub">{sub}</small>}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Đơn hàng — trang {page}/{totalPages}</h2>
          <div>
            <button className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>← Trước</button>
            <button className="btn btn-ghost" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Tiếp →</button>
          </div>
        </div>
        {loading ? (
          <div className="admin-orders-empty">Đang tải…</div>
        ) : orders.length === 0 ? (
          <div className="admin-orders-empty">Chưa có đơn hàng.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><code>{o.order_code}</code></td>
                    <td>{o.recipient_name || '—'}</td>
                    <td><strong>{formatCurrency(o.total_amount || 0)}</strong></td>
                    <td>{paymentText(o.payment_status)}</td>
                    <td>{statusText(o.order_status)}</td>
                    <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
