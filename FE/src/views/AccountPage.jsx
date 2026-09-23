'use client';

import { useState } from 'react';
import { AuthModal } from '../components/AuthModal.jsx';
import { Header } from '../components/Header.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const accountLinks = [
  { title: 'Đơn hàng của tôi', detail: 'Theo dõi đơn juice và combo trái cây', icon: '🧾' },
  { title: 'Địa chỉ giao hàng', detail: 'Quản lý địa chỉ nhận hàng trên web', icon: '📍' },
  { title: 'Phương thức thanh toán', detail: 'COD, ví điện tử hoặc chuyển khoản', icon: '💳' },
  { title: 'Thông báo', detail: 'Khuyến mãi, đơn hàng và hệ thống', icon: '🔔' },
  { title: 'Hỗ trợ khách hàng', detail: 'Chat, hotline và câu hỏi thường gặp', icon: '💬' },
  { title: 'Về FreshFruit Shop', detail: 'Thông tin thương hiệu và chính sách', icon: '🌿' },
];

export function AccountPage() {
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header cartQuantity={0} onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main account-layout">
        <section className="panel account-profile-panel">
          <span className="eyebrow">Customer account</span>
          <div className="account-avatar">👩🏻</div>
          <h1>{user?.user_metadata?.full_name || user?.email || 'Khách hàng FreshFruit'}</h1>
          <p>{user ? user.email : 'Đăng nhập để đồng bộ hồ sơ, đơn hàng và điểm thưởng qua Supabase Auth.'}</p>



          {user ? (
            <button className="btn btn-ghost full-width" type="button" onClick={signOut}>Đăng xuất</button>
          ) : (
            <button className="btn btn-primary full-width" type="button" onClick={() => setIsAuthOpen(true)}>
              Đăng nhập / Đăng ký
            </button>
          )}
        </section>

        <section className="panel account-menu-panel">
          <div className="section-heading">
            <span className="eyebrow">Web profile</span>
            <h2>Trung tâm tài khoản</h2>
            <p>Các mục từ thiết kế Profile được chuyển sang layout dashboard cho website.</p>
          </div>

          <div className="account-link-grid">
            {accountLinks.map((item) => (
              <article className="account-link-card" key={item.title}>
                <span>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <b>›</b>
              </article>
            ))}
          </div>
        </section>
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </div>
  );
}

