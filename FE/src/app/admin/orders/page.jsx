'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminOrders, formatCurrency, updateAdminOrderStatus } from '../../../services/productService.js';

const FILTERS = [
  ['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'],
  ['shipping', 'Đang giao'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy'],
];
const STATUSES = {
  pending: ['Chờ xác nhận', 'status-pending'], confirmed: ['Đã xác nhận', 'status-confirmed'],
  shipping: ['Đang giao', 'status-shipping'], completed: ['Hoàn tất', 'status-completed'],
  cancelled: ['Đã hủy', 'status-cancelled'],
};
const NEXT_STATUS = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadOrders = useCallback(async () => {
    setLoading(true); setError('');
    const result = await fetchAdminOrders({ page, limit: pageSize, status });
    setOrders(result.data); setTotal(result.total);
    setError(result.error ? 'Không tải được đơn hàng. Kiểm tra backend, quyền admin và cấu hình service role.' : '');
    setLoading(false);
  }, [page, status]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleStatusChange = async (orderId, nextStatus) => {
    if (!nextStatus) return;
    setUpdatingId(orderId); setError('');
    const result = await updateAdminOrderStatus(orderId, nextStatus);
    if (result.error) setError(result.error.message || 'Không cập nhật được trạng thái đơn.');
    await loadOrders();
    setUpdatingId(null);
  };

  return (
    <section className="admin-orders-page">
      <div className="admin-page-header">
        <div><span className="eyebrow">📦 Vận hành</span><h1>Quản lý đơn hàng</h1><p>Lọc và cập nhật trạng thái đơn theo quy trình xử lý.</p></div>
        <button className="btn btn-ghost" type="button" onClick={loadOrders} disabled={loading}>↻ Làm mới</button>
      </div>
      <div className="admin-order-filters" aria-label="Lọc theo trạng thái">
        {FILTERS.map(([value, label]) => <button key={value} type="button" className={status === value ? 'active' : ''} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}
      </div>
      {error && <div className="admin-orders-error" role="alert">{error}</div>}
      <div className="admin-panel admin-orders-panel">
        {loading ? <div className="admin-orders-empty">Đang tải đơn hàng…</div> : orders.length === 0 ? <div className="admin-orders-empty">Chưa có đơn hàng phù hợp.</div> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Điện thoại</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày đặt</th><th>Cập nhật</th></tr></thead><tbody>
            {orders.map((order) => {
              const badge = STATUSES[order.order_status] || [order.order_status, ''];
              const next = NEXT_STATUS[order.order_status] || [];
              return <tr key={order.id}>
                <td><code className="admin-order-code">{order.order_code || `#${String(order.id).slice(0, 8).toUpperCase()}`}</code></td>
                <td>{order.recipient_name || '—'}</td><td>{order.recipient_phone || '—'}</td>
                <td><strong>{formatCurrency(order.total_amount || 0)}</strong></td>
                <td><span className={`account-order-status ${badge[1]}`}>{badge[0]}</span></td>
                <td><small>{new Date(order.created_at).toLocaleDateString('vi-VN')}</small></td>
                <td>{next.length ? <select aria-label={`Cập nhật trạng thái ${order.order_code}`} value="" disabled={updatingId === order.id} onChange={(event) => handleStatusChange(order.id, event.target.value)}><option value="">{updatingId === order.id ? 'Đang lưu…' : 'Chọn trạng thái'}</option>{next.map((candidate) => <option key={candidate} value={candidate}>{STATUSES[candidate][0]}</option>)}</select> : <span className="admin-order-terminal">—</span>}</td>
              </tr>;
            })}
          </tbody></table></div>
        )}
      </div>
      <div className="admin-order-pagination"><span>{total} đơn · Trang {page} / {totalPages}</span><div><button className="btn btn-ghost" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Trước</button><button className="btn btn-ghost" type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Tiếp →</button></div></div>
    </section>
  );
}
