'use client';

import { useState } from 'react';
import { AuthModal } from '../components/AuthModal.jsx';
import { Header } from '../components/Header.jsx';
import { fallbackProducts } from '../services/productService.js';

const missions = [
  { title: 'Điểm danh web', reward: '+50 xu', icon: '🎁' },
  { title: 'Đánh giá đơn hàng', reward: '+80 xu', icon: '💬' },
  { title: 'Giới thiệu bạn bè', reward: '+120 xu', icon: '👥' },
];

const vouchers = [
  { code: 'FREESHIP30', title: 'Miễn phí giao hàng', detail: 'Áp dụng đơn từ 99.000đ', tone: 'orange' },
  { code: 'JUICE50', title: 'Giảm 50% nước ép', detail: 'Khung giờ 9:00 - 11:00', tone: 'green' },
  { code: 'COMBO25', title: 'Giảm 25% combo', detail: 'Dành cho khách hàng thành viên', tone: 'blue' },
];

export function RewardsPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header cartQuantity={0} onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main">
        <section className="section-heading center-heading rewards-hero">
          <span className="eyebrow">Web rewards</span>
          <h1>Ưu đãi và điểm thưởng dành cho website</h1>
          <p>
            Thiết kế rewards trong Figma được chuyển thành trang web riêng: thẻ điểm, voucher,
            nhiệm vụ tích xu và khu đổi quà lấy dữ liệu sản phẩm.
          </p>
        </section>

        <section className="web-dashboard-grid">
          <article className="panel reward-wallet">
            <span>⭐</span>
            <div>
              <small>Số dư ví thưởng</small>
              <strong>1.250 xu</strong>
              <p>Đổi nước ép, combo trái cây hoặc voucher giao hàng.</p>
            </div>
          </article>

          <article className="panel reward-promo-card">
            <small>FLASH SALE MÙA HÈ</small>
            <strong>Giảm đến 50% toàn bộ menu juice</strong>
            <span>Đồng bộ được với bảng vouchers trên Supabase khi bạn tạo dữ liệu thật.</span>
          </article>
        </section>

        <section className="section web-section-tight">
          <div className="section-heading">
            <span className="eyebrow">Voucher</span>
            <h2>Mã giảm giá nổi bật</h2>
          </div>
          <div className="voucher-grid">
            {vouchers.map((voucher) => (
              <article className={`voucher-card ${voucher.tone}`} key={voucher.code}>
                <span>{voucher.code}</span>
                <h3>{voucher.title}</h3>
                <p>{voucher.detail}</p>
                <button className="btn btn-ghost" type="button">Lưu mã</button>
              </article>
            ))}
          </div>
        </section>

        <section className="section web-section-tight">
          <div className="section-heading">
            <span className="eyebrow">Missions</span>
            <h2>Nhiệm vụ tích xu</h2>
          </div>
          <div className="mission-web-grid">
            {missions.map((mission) => (
              <article className="mission-web-card" key={mission.title}>
                <span>{mission.icon}</span>
                <strong>{mission.title}</strong>
                <small>{mission.reward}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="section web-section-tight">
          <div className="section-heading">
            <span className="eyebrow">Redeem</span>
            <h2>Đổi quà từ sản phẩm</h2>
          </div>
          <div className="reward-product-row">
            {fallbackProducts.slice(0, 4).map((product) => (
              <article className="reward-product-card" key={product.id}>
                <span>{product.image}</span>
                <strong>{product.name}</strong>
                <small>Đổi từ 350 xu</small>
              </article>
            ))}
          </div>
        </section>
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}

