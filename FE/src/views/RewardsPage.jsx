'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthModal } from '../components/AuthModal.jsx';
import { Header } from '../components/Header.jsx';
import { fallbackProducts } from '../services/productService.js';

const missions = [
  { title: 'Điểm danh hàng ngày', reward: '+5 xu', icon: '📅', done: true },
  { title: 'Đánh giá đơn hàng đã mua', reward: '+30 xu', icon: '⭐', done: false },
  { title: 'Giới thiệu bạn bè mới', reward: '+50 xu', icon: '👥', done: false },
];

const hotDeals = [
  {
    id: 'deal-1',
    badge: 'MUA 1 TẶNG 1',
    badgeClass: 'deal-badge-orange',
    name: 'Combo Sáng Khoái Cam Dâu',
    desc: 'Nước cam tươi phối dâu tây hữu cơ',
    oldPrice: '119.000đ',
    price: '59.500đ',
    emoji: '🍊',
  },
  {
    id: 'deal-2',
    badge: 'GIẢM 50%',
    badgeClass: 'deal-badge-green',
    name: 'Mâm Trái Cây Nhiệt Đới',
    desc: 'Set măng cụt, thanh long đỏ và xoài...',
    oldPrice: '180.000đ',
    price: '90.000đ',
    emoji: '🍉',
  },
  {
    id: 'deal-3',
    badge: 'COMBO TIẾT KIỆM',
    badgeClass: 'deal-badge-red',
    name: 'Glow Green Thái Độc',
    desc: 'x2 nước ép cần tây xoài đẹp da',
    oldPrice: '119.000đ',
    price: '79.000đ',
    emoji: '🥦',
  },
  {
    id: 'deal-4',
    badge: 'FLASH SALE',
    badgeClass: 'deal-badge-orange',
    name: 'Dâu Tây Đà Lạt Premium',
    desc: 'Dâu tây tươi Đà Lạt 500g chọn lọc thủ công',
    oldPrice: '150.000đ',
    price: '99.000đ',
    emoji: '🍓',
  },
  {
    id: 'deal-5',
    badge: 'GIẢM 40%',
    badgeClass: 'deal-badge-green',
    name: 'Nước Ép Xoài Dứa Tươi',
    desc: 'Xoài chín cát Hòa Lộc & dứa mật ép lạnh',
    oldPrice: '65.000đ',
    price: '39.000đ',
    emoji: '🥭',
  },
  {
    id: 'deal-6',
    badge: 'ĐỔI XU -30%',
    badgeClass: 'deal-badge-red',
    name: 'Combo Detox 3 Ngày',
    desc: '6 chai nước ép cold-press thanh lọc cơ thể',
    oldPrice: '320.000đ',
    price: '224.000đ',
    emoji: '🌿',
  },
];

const exchangeRewards = [
  { icon: '🎫', title: 'Voucher giảm 20K', detail: 'Đơn hàng từ 150K', cost: '200 Xu' },
  { icon: '🏷️', title: 'Voucher giảm 50K', detail: 'Đơn hàng từ 350K', cost: '450 Xu' },
  { icon: '🚚', title: 'Miễn Phí Vận Chuyển', detail: 'Tối đa 25K', cost: '150 Xu' },
  { icon: '🎰', title: 'Vòng Quay May Mắn', detail: 'Trúng quà tích xu', cost: '15 Xu / lượt' },
];

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả', icon: '🌿' },
  { id: 'live', label: 'Đang diễn ra', icon: '🔥' },
  { id: 'coin', label: 'Đổi xu', icon: '🪙' },
  { id: 'mine', label: 'Ưu đãi của tôi', icon: '⭐' },
];

function CountdownTimer() {
  const [time, setTime] = useState({ days: 2, hours: 14, minutes: 35 });
  const endAt = useRef(null);

  useEffect(() => {
    endAt.current = Date.now() + ((2 * 24 + 14) * 60 + 35) * 60_000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endAt.current - Date.now()) / 1000));
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      setTime({ days, hours, minutes });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rw-countdown">
      <span className="rw-countdown-label">Thời gian còn lại:</span>
      <span className="rw-countdown-time">
        {time.days} Ngày | {String(time.hours).padStart(2, '0')}h | {String(time.minutes).padStart(2, '0')}m
      </span>
    </div>
  );
}

export function RewardsPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header cartQuantity={0} onLoginClick={() => setIsAuthOpen(true)} />

      <main className="rw-main">

        {/* ── Top Dashboard Grid ── */}
        <div className="rw-top-grid">

          {/* Left – Xu tích lũy + Nhiệm vụ */}
          <div className="rw-left-col">

            {/* Xu card */}
            <div className="rw-xu-card">
              <div className="rw-xu-header">
                <span className="rw-xu-icon">⭐</span>
                <div>
                  <small>Xu Tích Lũy</small>
                  <a href="#" className="rw-xu-history">Lịch sử nhận xu →</a>
                </div>
              </div>
              <div className="rw-xu-amount">1.250 <span>Xu</span></div>
              <p className="rw-xu-hint">Bạn chỉ cần mua thêm <strong>50.000đ</strong> nữa để nhận 1 ly giữ miễn!</p>
              <div className="rw-xu-progress-wrap">
                <div className="rw-xu-progress-bar">
                  <div className="rw-xu-progress-fill" style={{ width: '62%' }} />
                </div>
                <div className="rw-xu-progress-labels">
                  <span>Đã mua 150k</span>
                  <span>Mục tiêu 200k</span>
                </div>
              </div>
            </div>

            {/* Nhiệm vụ */}
            <div className="rw-mission-card">
              <h3 className="rw-mission-title">Nhiệm Vụ Nhận Xu ✨</h3>
              <div className="rw-mission-list">
                {missions.map((m, i) => (
                  <div key={i} className={`rw-mission-item ${m.done ? 'rw-mission-done' : ''}`}>
                    <span className="rw-mission-icon">{m.icon}</span>
                    <div className="rw-mission-info">
                      <strong>{m.title}</strong>
                      <small>{m.reward}</small>
                    </div>
                    {m.done && <span className="rw-mission-check">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right – Flash Sale Banner */}
          <div className="rw-flash-banner">
            <div className="rw-flash-content">
              <span className="rw-flash-badge">🔥 SỰ KIỆN HOT NHẤT HÈ</span>
              <h2 className="rw-flash-title">Flash Sale Mùa Hè – Giảm đến 50%</h2>
              <p className="rw-flash-desc">
                Tận hưởng ưu đãi đến 50% cho nước ép tươi và trái cây tuyển chọn. Số lượng ưu đãi có hạn trong thời gian diễn ra chương trình.
              </p>
              <CountdownTimer />
            </div>
            <div className="rw-flash-art">
              <span className="rw-flash-emoji">🍹</span>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="rw-filter-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`rw-tab ${activeTab === tab.id ? 'rw-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              id={`rewards-tab-${tab.id}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Hot Deals ── */}
        <section className="rw-section">
          <h2 className="rw-section-title">Hot Deals Đang Diễn Ra 🔥</h2>
          <div className="rw-deals-grid">
            {hotDeals.map(deal => (
              <article key={deal.id} className="rw-deal-card">
                <div className="rw-deal-img">
                  <span className={`rw-deal-badge ${deal.badgeClass}`}><span aria-hidden="true">✦</span> {deal.badge}</span>
                  <span className="rw-deal-emoji">{deal.emoji}</span>
                </div>
                <div className="rw-deal-body">
                  <h3 className="rw-deal-name">{deal.name}</h3>
                  <p className="rw-deal-desc">{deal.desc}</p>
                  <div className="rw-deal-footer">
                    <div>
                      <small className="rw-deal-old">{deal.oldPrice}</small>
                      <strong className="rw-deal-price">{deal.price}</strong>
                    </div>
                    <button className="btn btn-primary rw-deal-btn" type="button" id={`deal-btn-${deal.id}`}>
                      Nhận deal
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Đổi Thưởng Tích Xu ── */}
        <section className="rw-section">
          <h2 className="rw-section-title">Đổi Thưởng Tích Xu 🪙</h2>
          <div className="rw-exchange-grid">
            {exchangeRewards.map((item, i) => (
              <article key={i} className="rw-exchange-card">
                <div className="rw-exchange-icon-wrap">
                  <span className="rw-exchange-icon">{item.icon}</span>
                </div>
                <strong className="rw-exchange-name">{item.title}</strong>
                <small className="rw-exchange-detail">{item.detail}</small>
                <div className="rw-exchange-cost">{item.cost}</div>
                <button className="rw-exchange-btn" type="button" id={`exchange-btn-${i}`}>
                  Đổi quà
                </button>
              </article>
            ))}
          </div>
        </section>

      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}
