'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthModal } from '../components/AuthModal.jsx';
import { Header } from '../components/Header.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cancelUserOrder, fetchOrderDetails, fetchUserOrders, fetchUserOrderSummary, formatCurrency, getUserProfile, updateUserProfile } from '../services/productService.js';

const STATUS = {
  pending: ['Chờ xác nhận', 'status-pending'],
  confirmed: ['Đã xác nhận', 'status-confirmed'],
  preparing: ['Đang chuẩn bị', 'status-preparing'],
  shipping: ['Đang giao', 'status-shipping'],
  completed: ['Hoàn tất', 'status-completed'],
  cancelled: ['Đã hủy', 'status-cancelled'],
};
const FILTERS = [
  ['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'],
  ['preparing', 'Đang chuẩn bị'], ['shipping', 'Đang giao'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy'],
];

export function AccountPage() {
  const { user, userRole, signOut, loading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', phone: '', avatar_url: '', created_at: '' });
  const [profileDraft, setProfileDraft] = useState({ full_name: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
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
  const [orderStats, setOrderStats] = useState({ total: 0, completed: 0, spent: 0 });
  const [defaultAddress, setDefaultAddress] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    let active = true;
    if (!user?.id) { setProfile({ full_name: '', phone: '', avatar_url: '', created_at: '' }); return undefined; }
    setProfileMessage('');
    setProfileLoading(true);
    getUserProfile(user.id).then(({ data, error }) => {
      if (!active) return;
      if (data) {
        const next = { ...data, full_name: data.full_name || user.user_metadata?.full_name || '', phone: data.phone || '' };
        setProfile(next); setProfileDraft({ full_name: next.full_name, phone: next.phone });
        try {
          const saved = JSON.parse(localStorage.getItem(`shipping_info_${user.id}`) || '{}');
          setDefaultAddress(saved.address || '');
          const searches = JSON.parse(localStorage.getItem(`recent_searches_${user.id}`) || '[]');
          setRecentSearches(Array.isArray(searches) ? searches.slice(0, 6) : []);
        } catch { setDefaultAddress(''); setRecentSearches([]); }
      } else setProfileMessage(error?.message || 'Không tải được hồ sơ.');
      setProfileLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) { setOrders([]); setTotalPages(0); return; }
    setOrdersLoading(true);
    setOrderError('');
    const result = await fetchUserOrders(user.id, { page, limit: 10, status });
    setOrders(result.data);
    setTotalPages(result.totalPages);
    setOrderError(result.error ? 'Không tải được lịch sử đơn hàng. Vui lòng thử lại.' : '');
    if (!result.error && page === 1 && status === 'all') {
      const summary = await fetchUserOrderSummary(user.id);
      if (summary.data) setOrderStats(summary.data);
    }
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
  const saveProfile = async (event) => {
    event.preventDefault(); if (!user?.id) return; setProfileSaving(true); setProfileMessage('');
    const result = await updateUserProfile(user.id, profileDraft); setProfileSaving(false);
    if (result.error) { setProfileMessage(result.error.message || 'Không thể lưu hồ sơ.'); return; }
    setProfile({ ...profile, ...result.data }); setProfileDraft({ full_name: result.data.full_name || '', phone: result.data.phone || '' });
    setProfileMessage('Đã lưu thông tin cá nhân.');
  };
  const clearRecentSearches = () => {
    if (!user?.id) return;
    try { localStorage.removeItem(`recent_searches_${user.id}`); } catch { /* browser storage unavailable */ }
    setRecentSearches([]);
  };
  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Khách hàng FreshFruit';
  const isAdmin = userRole === 'admin';

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header />
      <main className="page-main account-layout">
        <section className="panel account-profile-panel">
          <span className="eyebrow">{isAdmin ? 'Hồ sơ quản trị viên' : 'Hồ sơ khách hàng'}</span>
          <div className="account-avatar">{isAdmin ? '🛡️' : '👤'}</div>
          <h1>{displayName}</h1>
          <p>{user ? user.email : 'Đăng nhập để xem hồ sơ, đơn hàng và hoạt động tài khoản.'}</p>
          {user && <span className={`account-role-badge ${isAdmin ? 'is-admin' : ''}`}>{isAdmin ? 'Quản trị viên' : 'Khách hàng'}</span>}
          {!loading && (user
            ? <button className="btn btn-ghost full-width" type="button" onClick={signOut}>Đăng xuất</button>
            : <button className="btn btn-primary full-width" type="button" onClick={() => setIsAuthOpen(true)}>Đăng nhập / Đăng ký</button>)}
        </section>

        <div className="account-personal-content">
        {user && <section className="panel account-personal-panel">
          <div className="section-heading"><span className="eyebrow">Thông tin cá nhân</span><h2>Hồ sơ của tôi</h2><p>Chỉ bạn mới xem và cập nhật được thông tin này.</p></div>
          {profileLoading ? <p role="status">Đang tải hồ sơ…</p> : <form className="account-profile-form" onSubmit={saveProfile}><label>Họ và tên<input required minLength={2} maxLength={120} value={profileDraft.full_name} onChange={(event) => setProfileDraft((draft) => ({ ...draft, full_name: event.target.value }))} /></label><label>Email<input value={user.email || ''} readOnly disabled /></label><label>Số điện thoại<input type="tel" maxLength={30} value={profileDraft.phone} onChange={(event) => setProfileDraft((draft) => ({ ...draft, phone: event.target.value }))} placeholder="Chưa cập nhật" /></label><label>Vai trò<input value={isAdmin ? 'Quản trị viên' : 'Khách hàng'} readOnly disabled /></label><div className="account-profile-form-footer"><small>Tham gia: {profile.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '—'}</small><button className="btn btn-primary" type="submit" disabled={profileSaving || !profileDraft.full_name.trim()}>{profileSaving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div>{profileMessage && <p role="status">{profileMessage}</p>}</form>}
        </section>}

        {user && <section className="account-personal-stats" aria-label="Tổng quan hoạt động"><article><span>🧾</span><small>Tổng đơn</small><strong>{orderStats.total}</strong></article><article><span>✅</span><small>Đã hoàn tất</small><strong>{orderStats.completed}</strong></article><article><span>🛍️</span><small>Chi tiêu đơn không hủy · trang đầu</small><strong>{formatCurrency(orderStats.spent)}</strong></article><article><span>{isAdmin ? '🛡️' : '🌱'}</span><small>Loại tài khoản</small><strong>{isAdmin ? 'Admin' : 'Khách hàng'}</strong></article></section>}

        {isAdmin && <section className="panel account-personal-panel"><div className="section-heading"><span className="eyebrow">Không gian quản trị</span><h2>Thao tác admin</h2><p>Truy cập nhanh các khu vực quản trị.</p></div><div className="account-admin-shortcuts"><Link href="/admin">📊 Dashboard</Link><Link href="/admin/orders">📦 Quản lý đơn</Link><Link href="/admin/products">🍊 Sản phẩm</Link><Link href="/admin/users">👥 Tài khoản</Link></div></section>}

        {user && <section className="panel account-personal-panel account-personal-activity"><div className="section-heading"><span className="eyebrow">Hoạt động cá nhân</span><h2>Thông tin sử dụng</h2><p>Một số thông tin được lưu trên thiết bị này; chúng không phải log kiểm toán phía server.</p></div><div className="account-activity-list"><div><span>📍</span><span><small>Địa chỉ giao hàng gần nhất</small><strong>{defaultAddress || 'Chưa lưu địa chỉ giao hàng'}</strong></span></div><div><span>🔎</span><span><small>Tìm kiếm gần đây</small>{recentSearches.length ? <div className="account-search-history">{recentSearches.map((term, index) => <Link key={`${term}-${index}`} href={`/menu?search=${encodeURIComponent(term)}`}>{term}</Link>)}</div> : <strong>Chưa có lịch sử tìm kiếm</strong>}</span></div></div>{recentSearches.length > 0 && <button className="btn btn-ghost" type="button" onClick={clearRecentSearches}>Xóa tìm kiếm gần đây</button>}</section>}

        <section className="panel account-menu-panel">
          <div className="section-heading">
            <span className="eyebrow">{isAdmin ? 'Lịch sử hoạt động mua' : 'Trung tâm khách hàng'}</span>
            <h2>Lịch sử mua hàng</h2>
            <p>Các đơn hàng gắn với tài khoản này; dữ liệu chỉ được tải sau khi đăng nhập.</p>
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
        </div>
      </main>
      {(detailLoading || selectedOrder) && <div className="account-order-modal-backdrop" role="presentation" onClick={() => !detailLoading && setSelectedOrder(null)}><section className="account-order-modal panel" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng" onClick={(event) => event.stopPropagation()}><button className="account-order-modal-close" type="button" aria-label="Đóng" onClick={() => { setSelectedOrder(null); setActionError(''); }}>×</button>{detailLoading ? <div className="account-orders-empty">Đang tải chi tiết đơn…</div> : selectedOrder && <><span className="eyebrow">Chi tiết đơn hàng</span><h2>#{selectedOrder.order_code}</h2><p>{selectedOrder.recipient_name} · {selectedOrder.recipient_phone}</p><p>{selectedOrder.shipping_address}</p><div className="account-order-items">{(selectedOrder.items || []).map((item) => <div className="account-order-item" key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{formatCurrency(item.item_subtotal)}</strong></div>)}</div><div className="account-order-item account-order-grand-total"><span>Tổng cộng</span><strong>{formatCurrency(selectedOrder.total_amount)}</strong></div>{actionError && <p className="account-orders-error" role="alert">{actionError}</p>}{selectedOrder.order_status === 'pending' && <button className="btn btn-ghost" type="button" disabled={cancellingId === selectedOrder.id} onClick={() => cancelOrder(selectedOrder.id)}>{cancellingId === selectedOrder.id ? 'Đang hủy…' : 'Hủy đơn hàng'}</button>}</>}</section></div>}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
