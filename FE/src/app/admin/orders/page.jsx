'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminDashboard, fetchAdminOrderDetails, fetchAdminOrders, formatCurrency, updateAdminOrderStatus } from '../../../services/productService.js';

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'preparing', label: 'Đang chuẩn bị' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const STATUS_PILL = {
  pending: { label: 'Chờ xác nhận', className: 'pill-pending' },
  confirmed: { label: 'Đã xác nhận', className: 'pill-preparing' },
  preparing: { label: 'Đang chuẩn bị', className: 'pill-preparing' },
  shipping: { label: 'Đang giao', className: 'pill-shipping' },
  completed: { label: 'Đã giao', className: 'pill-completed' },
  delivered: { label: 'Đã giao', className: 'pill-completed' },
  cancelled: { label: 'Đã hủy', className: 'pill-cancelled' },
  failed: { label: 'Thất bại', className: 'pill-cancelled' },
};

const PAYMENT_PILL = {
  paid: { label: 'Đã thanh toán', className: 'pill-paid' },
  unpaid: { label: 'Chưa thanh toán', className: 'pill-unpaid' },
  pending: { label: 'Đang xử lý', className: 'pill-unpaid' },
  failed: { label: 'Thanh toán lỗi', className: 'pill-failed' },
  refunded: { label: 'Đã hoàn tiền', className: 'pill-failed' },
};

const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'shipping', 'cancelled'],
  preparing: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

const NEXT_LABELS = {
  confirmed: 'Xác nhận đơn',
  preparing: 'Chuẩn bị hàng',
  shipping: 'Bắt đầu giao',
  completed: 'Giao thành công',
  cancelled: 'Hủy đơn',
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const size = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [list, dashboard] = await Promise.all([
      fetchAdminOrders({ page, limit: size, status, payment, search }),
      fetchAdminDashboard(),
    ]);
    setOrders(list.data);
    setTotal(list.total);
    setTotalPages(Math.max(1, list.totalPages));
    if (list.error) setError(list.error.message || 'Không tải được đơn hàng.');
    if (!dashboard.error) setStats(dashboard.data?.stats || null);
    setLoading(false);
  }, [page, status, payment, search]);

  useEffect(() => { load(); }, [load, reloadKey]);

  // Đếm số đơn cho từng tab (mỗi tab 1 request rất nhẹ, limit 1).
  useEffect(() => {
    let active = true;
    Promise.all([
      'pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled',
    ].map((value) => fetchAdminOrders({ page: 1, limit: 1, status: value }).then((result) => [value, result.total || 0])))
      .then((pairs) => { if (active) setCounts(Object.fromEntries(pairs)); })
      .catch(() => { /* bỏ qua lỗi đếm, không làm vỡ trang */ });
    return () => { active = false; };
  }, [reloadKey]);

  const update = async (id, next) => {
    if (!next) return;
    setUpdating(id);
    const result = await updateAdminOrderStatus(id, next);
    if (result.error) setError(result.error.message || 'Không thể cập nhật trạng thái.');
    else setReloadKey((key) => key + 1);
    setUpdating(null);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({});
    const result = await fetchAdminOrderDetails(id);
    setDetailLoading(false);
    setDetail(result.error ? { error: result.error.message } : result.data);
  };

  const exportCsv = () => {
    const rows = [
      ['Mã đơn', 'Khách hàng', 'Điện thoại', 'Tổng tiền VND', 'Thanh toán', 'Trạng thái', 'Ngày đặt'],
      ...orders.map((order) => [order.order_code, order.recipient_name, order.recipient_phone, order.total_amount, order.payment_status, order.order_status, order.created_at]),
    ];
    const content = '\ufeff' + rows.map((row) => row.map((value) => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'don-hang.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => String(order.created_at || '').slice(0, 10) === today).length;
  const completedToday = orders.filter((order) => order.order_status === 'completed' && String(order.created_at || '').slice(0, 10) === today).length;
  const inProgress = (counts.preparing || 0) + (counts.shipping || 0);

  const totalForTab = (value) => {
    if (value === 'all') return stats?.totalOrders ?? total;
    if (value === 'shipping') return counts.shipping || 0;
    return counts[value] || 0;
  };

  return (
    <section className="admin-orders-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">📦 Vận hành</span>
          <h1>Quản lý đơn hàng</h1>
          <p>Theo dõi và xử lý từng đơn hàng, từ vườn tươi đến tay khách.</p>
        </div>
        <div className="admin-product-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>↻ Làm mới</button>
          <button className="btn btn-primary" type="button" onClick={exportCsv} disabled={!orders.length}>Xuất danh sách</button>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card admin-stat-card--today">
          <div className="admin-stat-body">
            <p className="admin-stat-label">Đơn hàng hôm nay</p>
            <strong className="admin-stat-value">{todayOrders}</strong>
            <small className="admin-stat-sub">Tổng cộng {(stats?.totalOrders ?? total).toLocaleString("vi-VN")} đơn</small>
          </div>
          <span className="admin-stat-badge">🧾</span>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-body">
            <p className="admin-stat-label">Chờ xác nhận</p>
            <strong className="admin-stat-value">{counts.pending ?? stats?.pendingOrders ?? 0}</strong>
            <small className="admin-stat-sub">Cần xử lý trong hôm nay</small>
          </div>
          <span className="admin-stat-badge">⏱️</span>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-body">
            <p className="admin-stat-label">Đang chuẩn bị / giao</p>
            <strong className="admin-stat-value">{inProgress}</strong>
            <small className="admin-stat-sub">{counts.preparing || 0} chuẩn bị · {counts.shipping || 0} đang giao</small>
          </div>
          <span className="admin-stat-badge">🚚</span>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-body">
            <p className="admin-stat-label">Đã giao hôm nay</p>
            <strong className="admin-stat-value">{completedToday}</strong>
            <small className="admin-stat-sub">Đơn hoàn tất trong ngày</small>
          </div>
          <span className="admin-stat-badge">✅</span>
        </div>
      </div>

      <div className="admin-panel admin-orders-panel">
        <div className="admin-orders-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              className={'admin-orders-tab' + (status === tab.value ? ' is-active' : '')}
              aria-selected={status === tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
            >
              {tab.label} <span>{totalForTab(tab.value)}</span>
            </button>
          ))}
        </div>

        <div className="admin-orders-toolbar">
          <div className="admin-orders-search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              aria-label="Tìm đơn hàng"
              placeholder="Tìm mã đơn, tên, số điện thoại…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <select aria-label="Lọc thanh toán" value={payment} onChange={(event) => { setPayment(event.target.value); setPage(1); }}>
            <option value="all">Mọi thanh toán</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="failed">Thất bại</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
        </div>

        {error && <div className="admin-orders-error" role="alert">{error}</div>}

        <div className="admin-table-wrap">
          <table className="admin-table admin-orders-table">
            <thead>
              <tr>
                <th>Mã đơn / Ngày đặt</th>
                <th>Khách hàng</th>
                <th>Giá trị</th>
                <th>Thanh toán</th>
                <th>Xử lý / Giao hàng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-orders-empty">Đang tải đơn hàng…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="admin-orders-empty">Không có đơn phù hợp.</td></tr>
              ) : (
                orders.map((order) => {
                  const statusPill = STATUS_PILL[order.order_status] || { label: order.order_status, className: 'pill-unpaid' };
                  const payPill = PAYMENT_PILL[order.payment_status] || { label: order.payment_status || '—', className: 'pill-unpaid' };
                  const next = NEXT[order.order_status] || [];
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong className="admin-order-code">{order.order_code || order.id}</strong>
                        <small className="admin-order-date">{order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '—'}</small>
                      </td>
                      <td>
                        <strong>{order.recipient_name || '—'}</strong>
                        <small className="admin-order-date">{order.recipient_phone || '—'}</small>
                      </td>
                      <td><strong>{formatCurrency(order.total_amount || 0)}</strong></td>
                      <td><span className={'admin-pill ' + payPill.className}>{payPill.label}</span></td>
                      <td><span className={'admin-pill ' + statusPill.className}>{statusPill.label}</span></td>
                      <td>
                        <div className="admin-product-actions">
                          <button className="admin-icon-btn" type="button" onClick={() => openDetail(order.id)} aria-label="Xem chi tiết">👁</button>
                          {next.length > 0 && (
                            <select
                              aria-label={'Cập nhật trạng thái ' + order.order_code}
                              value=""
                              disabled={updating === order.id}
                              onChange={(event) => update(order.id, event.target.value)}
                            >
                              <option value="">{updating === order.id ? 'Đang lưu…' : 'Cập nhật'}</option>
                              {next.map((value) => <option key={value} value={value}>{NEXT_LABELS[value] || value}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-order-pagination">
          <span>{total} đơn · Trang {page} / {totalPages}</span>
          <div>
            <button className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>← Trước</button>
            <button className="btn btn-ghost" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Tiếp →</button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="admin-product-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="admin-product-modal panel" role="dialog" aria-modal="true" aria-label="Chi tiết đơn" onClick={(event) => event.stopPropagation()}>
            <button className="account-order-modal-close" type="button" onClick={() => setDetail(null)}>×</button>
            <h2>Chi tiết đơn hàng</h2>
            {detailLoading ? (
              <p>Đang tải…</p>
            ) : detail.error ? (
              <p role="alert">{detail.error}</p>
            ) : (
              <>
                <p><strong>{detail.order_code}</strong> · {detail.recipient_name}</p>
                <p>{detail.recipient_phone} · {detail.shipping_address}</p>
                <p>
                  Thanh toán: {(PAYMENT_PILL[detail.payment_status] || {}).label || detail.payment_status}
                  {' · '}{detail.payment_method || '—'}
                </p>
                <p>Ghi chú: {detail.note || '—'}</p>
                <h3>Sản phẩm</h3>
                {(detail.items || []).map((item) => (
                  <p key={item.id}>{item.product_name} × {item.quantity} — {formatCurrency(item.item_subtotal)}</p>
                ))}
                <strong>Tổng: {formatCurrency(detail.total_amount || 0)}</strong>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

