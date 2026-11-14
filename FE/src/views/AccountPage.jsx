'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthModal } from '../components/AuthModal.jsx';
import { Header } from '../components/Header.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cancelUserOrder, fetchOrderDetails, fetchUserOrders, formatCurrency } from '../services/productService.js';

const STATUS = {
  pending: ['Chờ xác nhận', 'status-pending'],
  confirmed: ['Đã xác nhận', 'status-confirmed'],
  shipping: ['Đang giao', 'status-shipping'],
  completed: ['Hoàn tất', 'status-completed'],
  cancelled: ['Đã hủy', 'status-cancelled'],
};
const FILTERS = [
  ['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'],
  ['shipping', 'Đang giao'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy'],
];

export function AccountPage() {
  const { user, signOut, loading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrders = useCallback(async () => {
    if (!user?.id) { setOrders([]); setTotalPages(0); return; }
    setOrdersLoading(true);
    setOrderError('');
    const result = await fetchUserOrders(user.id, { page, limit: 10, status });
    setOrders(result.data);
    setTotalPages(result.totalPages);
    setOrderError(result.error ? 'Không tải được lịch sử đơn hàng. Vui lòng thử lại.' : '');
    setOrdersLoading(false);
  }, [user?.id, page, status]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const changeFilter = (nextStatus) => { setStatus(nextStatus); setPage(1); };

  const openOrder = async (orderId) => {
    setDetailLoading(true); setActionError(''); setSelectedOrder(null);
    const result = await fetchOrderDetails(orderId);
    setSelectedOrder(result.data);
    setActionError(result.error ? 'Không tải được chi tiết đơn hàng.' : '');
    setDetailLoading(false);
  };

  const cancelOrder = async (orderId) => {
    setCancellingId(orderId); setActionError('');
    const result = await cancelUserOrder(orderId);
    setCancellingId(null);
    if (result.error) { setActionError(result.error.message || 'Không thể hủy đơn hàng.'); return; }
    await loadOrders();
    if (selectedOrder?.id === orderId) setSelectedOrder((current) => ({ ...current, order_status: 'cancelled' }));
  };
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Khách hàng FreshFruit';

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header />
      <main className="page-main account-layout">
        <section className="panel account-profile-panel">
          <span className="eyebrow">Tài khoản khách hàng</span>
          <div className="account-avatar">👩🏻</div>
          <h1>{displayName}</h1>
          <p>{user ? user.email : 'Đăng nhập để đồng bộ hồ sơ, đơn hàng và điểm thưởng.'}</p>
          {!loading && (user
            ? <button className="btn btn-ghost full-width" type="button" onClick={signOut}>Đăng xuất</button>
            : <button className="btn btn-primary full-width" type="button" onClick={() => setIsAuthOpen(true)}>Đăng nhập / Đăng ký</button>)}
        </section>

        <section className="panel account-menu-panel">
          <div className="section-heading">
            <span className="eyebrow">Trung tâm khách hàng</span>
            <h2>Đơn hàng của tôi</h2>
            <p>Theo dõi trạng thái các đơn hàng bạn đã đặt.</p>
          </div>

          {!user && !loading ? (
            <div className="account-orders-empty"><span>🔒</span><h3>Đăng nhập để xem đơn hàng</h3><p>Lịch sử đơn hàng chỉ hiển thị cho đúng tài khoản đã đặt.</p></div>
          ) : (
            <>
              <div className="account-order-filters" aria-label="Lọc đơn hàng">
                {FILTERS.map(([value, label]) => <button key={value} type="button" className={status === value ? 'active' : ''} onClick={() => changeFilter(value)}>{label}</button>)}
              </div>
              {ordersLoading ? <div className="account-orders-empty" role="status">Đang tải đơn hàng…</div>
                : orderError ? <div className="account-orders-empty account-orders-error" role="alert">{orderError}<button className="btn btn-ghost" type="button" onClick={loadOrders}>Thử lại</button></div>
                : orders.length === 0 ? <div className="account-orders-empty"><span>🧾</span><h3>Chưa có đơn hàng</h3><p>Đơn hàng của bạn sẽ xuất hiện tại đây sau khi đặt mua.</p><Link href="/menu" className="btn btn-primary">Khám phá sản phẩm</Link></div>
                : <div className="account-orders-list">{orders.map((order) => {
                  const badge = STATUS[order.order_status] || [order.order_status, ''];
                  return <article className="account-order-row" key={order.id}>
                    <button className="account-order-open" type="button" onClick={() => openOrder(order.id)}><strong>#{order.order_code || order.id.slice(0, 8).toUpperCase()}</strong><small>{new Date(order.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}</small></button>
                    <span className={`account-order-status ${badge[1]}`}>{badge[0]}</span>
                    <strong className="account-order-total">{formatCurrency(order.total_amount)}</strong>
                    <button className="account-order-detail-link" type="button" onClick={() => openOrder(order.id)}>Chi tiết →</button>
                  </article>;
                })}</div>}
              {totalPages > 1 && <div className="account-order-pagination"><button className="btn btn-ghost" type="button" disabled={page <= 1 || ordersLoading} onClick={() => setPage((n) => n - 1)}>← Trước</button><span>Trang {page} / {totalPages}</span><button className="btn btn-ghost" type="button" disabled={page >= totalPages || ordersLoading} onClick={() => setPage((n) => n + 1)}>Tiếp →</button></div>}
            </>
          )}
        </section>
      </main>
      {(detailLoading || selectedOrder) && <div className="account-order-modal-backdrop" role="presentation" onClick={() => !detailLoading && setSelectedOrder(null)}><section className="account-order-modal panel" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng" onClick={(event) => event.stopPropagation()}><button className="account-order-modal-close" type="button" aria-label="Đóng" onClick={() => { setSelectedOrder(null); setActionError(''); }}>×</button>{detailLoading ? <div className="account-orders-empty">Đang tải chi tiết đơn…</div> : selectedOrder && <><span className="eyebrow">Chi tiết đơn hàng</span><h2>#{selectedOrder.order_code}</h2><p>{selectedOrder.recipient_name} · {selectedOrder.recipient_phone}</p><p>{selectedOrder.shipping_address}</p><div className="account-order-items">{(selectedOrder.items || []).map((item) => <div className="account-order-item" key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{formatCurrency(item.item_subtotal)}</strong></div>)}</div><div className="account-order-item account-order-grand-total"><span>Tổng cộng</span><strong>{formatCurrency(selectedOrder.total_amount)}</strong></div>{actionError && <p className="account-orders-error" role="alert">{actionError}</p>}{selectedOrder.order_status === 'pending' && <button className="btn btn-ghost" type="button" disabled={cancellingId === selectedOrder.id} onClick={() => cancelOrder(selectedOrder.id)}>{cancellingId === selectedOrder.id ? 'Đang hủy…' : 'Hủy đơn hàng'}</button>}</>}</section></div>}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
