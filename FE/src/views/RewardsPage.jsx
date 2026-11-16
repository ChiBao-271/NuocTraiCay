'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '../components/Header.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { fetchProducts, fetchUserOrders, formatCurrency, getUserProfile } from '../services/productService.js';

const COIN_TARGET = 2000;
const LOCKED_REWARDS = [
  { name: 'Voucher giảm 20K', note: 'Đơn hàng từ 150.000đ', cost: '200 Xu', icon: '🎟️' },
  { name: 'Voucher giảm 50K', note: 'Đơn hàng từ 250.000đ', cost: '450 Xu', icon: '🎫' },
  { name: 'Miễn phí vận chuyển', note: 'Áp dụng mọi đơn hàng', cost: '150 Xu', icon: '🚚' },
  { name: 'Vòng quay may mắn', note: 'Mỗi lượt quay 1 phần quà', cost: '50 Xu / lượt', icon: '🎡' },
];

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'live', label: 'Đang diễn ra' },
  { id: 'redeem', label: 'Đổi Xu' },
  { id: 'mine', label: 'Ưu đãi của tôi' },
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function useCountdown() {
  const [left, setLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const totalMinutes = Math.floor(diff / 60000);
      setLeft({
        days: Math.floor(totalMinutes / (60 * 24)),
        hours: Math.floor((totalMinutes % (60 * 24)) / 60),
        minutes: totalMinutes % 60,
      });
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, []);
  return left;
}

export function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checkedIn, setCheckedIn] = useState(false);
  const [toast, setToast] = useState('');
  const countdown = useCountdown();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProducts()
      .then((result) => { if (active) setProducts(result.data || []); })
      .catch(() => { if (active) setError('Không tải được danh sách ưu đãi sản phẩm.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user?.id) { setLoading(false); setCoins(0); setOrders([]); return undefined; }
    let active = true;
    Promise.all([getUserProfile(user.id), fetchUserOrders(user.id, { page: 1, limit: 20 })])
      .then(([profile, history]) => {
        if (!active) return;
        if (!profile.error) setCoins(Number(profile.data?.coins || 0));
        if (!history.error) setOrders(history.data || []);
      })
      .catch(() => { if (active) setError('Không tải được thông tin tích luỹ.'); })
      .finally(() => { if (active) setLoading(false); });
    const today = new Date().toISOString().slice(0, 10);
    try {
      setCheckedIn(window.localStorage.getItem('checkin_' + user.id + '_' + today) === '1');
    } catch { setCheckedIn(false); }
    return () => { active = false; };
  }, [user?.id, authLoading]);

  const completedOrders = orders.filter((order) => order.order_status === 'completed').length;

  const deals = useMemo(() => {
    const sorted = [...products].sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)));
    return sorted.slice(0, 3);
  }, [products]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const handleCheckin = () => {
    if (!user?.id) { setIsAuthOpen(true); return; }
    const today = new Date().toISOString().slice(0, 10);
    try {
      window.localStorage.setItem('checkin_' + user.id + '_' + today, '1');
    } catch { /* trình duyệt chặn lưu trữ */ }
    setCheckedIn(true);
    showToast('Điểm danh thành công! Hẹn gặp bạn ngày mai.');
  };

  const handleCopyReferral = async () => {
    if (!user?.id) { setIsAuthOpen(true); return; }
    const link = window.location.origin + '/?ref=' + user.id;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Đã sao chép link giới thiệu');
    } catch {
      showToast('Link giới thiệu: ' + link);
    }
  };

  const progress = Math.min(100, Math.round((coins / COIN_TARGET) * 100));
  const needMore = Math.max(0, COIN_TARGET - coins);

  const showDeals = filter === 'all' || filter === 'live';
  const showRewards = filter === 'all' || filter === 'redeem' || filter === 'mine';

  return (
    <div className="site-shell page-shell rewards-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main rewards-main">
        <div className="rewards-layout">
          <aside className="rewards-side">
            <section className="rewards-card">
              <div className="rewards-card-head">
                <h2>🪙 Xu Tích Luỹ</h2>
                <Link href="/account" className="rewards-link">Lịch sử nhận xu</Link>
              </div>
              <p className="rewards-coins">{loading ? '…' : coins.toLocaleString('vi-VN')} <span>Xu</span></p>
              <div className="rewards-progress"><span style={{ width: progress + '%' }} /></div>
              <p className="rewards-note">
                {needMore > 0
                  ? 'Bạn cần tích thêm ' + needMore.toLocaleString('vi-VN') + ' xu nữa để nhận 1 ly nước ép miễn phí'
                  : 'Bạn đã đủ xu để đổi 1 ly nước ép miễn phí!'}
              </p>
              <p className="rewards-sub">Hạn sử dụng: 31/12/2026</p>
            </section>

            <section className="rewards-card">
              <div className="rewards-card-head"><h2>Nhiệm Vụ Nhận Xu ⚡</h2></div>
              <ul className="rewards-missions">
                <li>
                  <span className="rewards-mission-icon">📅</span>
                  <div><strong>Điểm danh hàng ngày</strong><small>+5 Xu</small></div>
                  {checkedIn
                    ? <span className="rewards-done">✓ Đã điểm danh</span>
                    : <button type="button" className="rewards-mini-btn" onClick={handleCheckin}>Điểm danh</button>}
                </li>
                <li>
                  <span className="rewards-mission-icon">⭐</span>
                  <div><strong>Đánh giá đơn hàng đã mua</strong><small>+10 Xu</small></div>
                  {completedOrders > 0
                    ? <span className="rewards-done">{'✓ Đã hoàn tất ' + completedOrders + ' đơn'}</span>
                    : <span className="rewards-muted">Chưa có đơn hoàn tất</span>}
                </li>
                <li>
                  <span className="rewards-mission-icon">👥</span>
                  <div><strong>Giới thiệu bạn bè</strong><small>+50 Xu</small></div>
                  <button type="button" className="rewards-mini-btn" onClick={handleCopyReferral}>Sao chép link</button>
                </li>
              </ul>
            </section>
          </aside>

          <div className="rewards-main-col">
            <section className="rewards-hero">
              <div className="rewards-hero-copy">
                <span className="rewards-hero-badge">SỰ KIỆN ĐẶC BIỆT</span>
                <h1>Flash Sale Mùa Hè – Giảm đến 50%</h1>
                <p>Hái những cơn ngọt lành từ vườn đưa thẳng đến ly nước ép của bạn, cùng ưu đãi hấp dẫn cho trái cây tươi mỗi ngày.</p>
                <div className="rewards-countdown">
                  <span>Thời gian còn lại</span>
                  <div className="rewards-countdown-boxes">
                    <div><strong>{pad(countdown.days)}</strong><small>Ngày</small></div>
                    <div><strong>{pad(countdown.hours)}</strong><small>Giờ</small></div>
                    <div><strong>{pad(countdown.minutes)}</strong><small>Phút</small></div>
                  </div>
                </div>
              </div>
              <div className="rewards-hero-art">
                {products[0]?.imageUrl
                  ? <img src={products[0].imageUrl} alt="" loading="lazy" />
                  : <span>🍹</span>}
              </div>
            </section>

            <div className="rewards-filters">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={'rewards-chip' + (filter === item.id ? ' is-active' : '')}
                  onClick={() => setFilter(item.id)}
                >{item.label}</button>
              ))}
            </div>

            {error && <p className="rewards-error" role="alert">{error}</p>}

            {showDeals && (
              <section className="rewards-section">
                <h2>HOT Deals Đang Diễn Ra 🔥</h2>
                {deals.length === 0 ? (
                  <p className="rewards-muted">Chưa có sản phẩm nào để hiển thị ưu đãi.</p>
                ) : (
                  <div className="rewards-deals">
                    {deals.map((product) => (
                      <article className="rewards-deal" key={product.id}>
                        <div className="rewards-deal-img">
                          <span className="rewards-deal-badge">{product.isBestseller ? 'BÁN CHẠY' : (product.categoryName || 'ƯU ĐÃI')}</span>
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : <span className="rewards-deal-emoji">{product.image || '🍊'}</span>}
                        </div>
                        <div className="rewards-deal-body">
                          <strong>{product.name}</strong>
                          <p>{product.description}</p>
                          <div className="rewards-deal-foot">
                            <span className="rewards-deal-price">{formatCurrency(product.price)}</span>
                            <Link href={'/product/' + product.id} className="rewards-deal-link">Xem chi tiết</Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {showRewards && (
              <section className="rewards-section">
                <h2>Đổi Thưởng Tích Xu 💡</h2>
                <p className="rewards-muted">Tính năng đổi quà bằng xu đang được hoàn thiện.</p>
                <div className="rewards-catalogue">
                  {LOCKED_REWARDS.map((reward) => (
                    <article className="rewards-reward" key={reward.name}>
                      <span className="rewards-reward-icon">{reward.icon}</span>
                      <strong>{reward.name}</strong>
                      <small>{reward.note}</small>
                      <span className="rewards-reward-cost">{reward.cost}</span>
                      <button type="button" className="rewards-reward-btn" disabled>Sắp mở</button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {toast && <div className="rewards-toast" role="status">{toast}</div>}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}

