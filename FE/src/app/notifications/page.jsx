'use client';

import { useState } from 'react';
import { Header } from '../../components/Header.jsx';

const FILTER_TABS = ['Tất cả', 'Khuyến mãi', 'Đơn hàng', 'Hệ thống'];

const NOTIFICATIONS = {
  promo: [
    {
      id: 'p1',
      icon: '🎁',
      iconBg: '#fff3e0',
      title: 'Giảm ngay 30% cho lần uống đầu tiên!',
      desc: 'Chào mừng bạn đến với Original Fruits. Nhập mã FIRST30 tại màn hình tóm tắt thanh toán để nhận ưu đãi thanh lọc cơ thể tươi mát.',
      time: '10 phút trước',
      unread: true,
    },
    {
      id: 'p2',
      icon: '🚚',
      iconBg: '#e8f5e9',
      title: 'Freeship toàn quốc cho hóa đơn từ $50',
      desc: 'Thoải mái đặt nước ép tươi lạnh cả tuần không lo về phí vận chuyển. Áp dụng tự động khi thanh toán.',
      time: '1 ngày trước',
      unread: false,
    },
  ],
  order: [
    {
      id: 'o1',
      icon: '✈️',
      iconBg: '#e3f2fd',
      title: 'Đơn hàng #OF-9482 đang được giao!',
      desc: 'Tài xế giao hàng đang mang ly Mango Sunrise mát lạnh đến địa chỉ của bạn. Vui lòng giữ điện thoại.',
      time: '30 phút trước',
      unread: true,
    },
    {
      id: 'o2',
      icon: '✅',
      iconBg: '#e8f5e9',
      title: 'Đã giao hàng thành công đơn #OF-8103',
      desc: 'Hy vọng bạn hai lòng với hương vị Citrus Punch & Berry Wild. Hãy để lại đánh giá cho chúng tôi nhé!',
      time: '3 ngày trước',
      unread: false,
    },
    {
      id: 'o3',
      icon: '⚙️',
      iconBg: '#fce4ec',
      title: 'Đơn hàng đang chuẩn bị',
      desc: 'Chúng tôi đang lựa chọn những trái cây tươi nhất để chuẩn bị cho ly Green Glow của bạn.',
      time: '4 ngày trước',
      unread: false,
    },
  ],
  system: [
    {
      id: 's1',
      icon: '🎂',
      iconBg: '#f3e5f5',
      title: 'Món quà sinh nhật sớm dành riêng cho bạn',
      desc: 'Thành nhật sinh nhật ngập tràn vitamin! Original Fruits tặng bạn voucher 50% áp dụng cho toàn bộ menu nước ép.',
      time: '2 ngày trước',
      unread: true,
    },
    {
      id: 's2',
      icon: '📱',
      iconBg: '#e8f5e9',
      title: 'Cập nhật ứng dụng phiên bản v2.4',
      desc: 'Trải nghiệm giao diện mượt mà hơn, theo dõi hành trình shipper thời gian thực dễ dàng hơn.',
      time: '1 tuần trước',
      unread: false,
    },
  ],
};

function NotifItem({ notif }) {
  return (
    <div className={`notif-item ${notif.unread ? 'notif-item--unread' : ''}`}>
      <div className="notif-icon-wrap" style={{ background: notif.iconBg }}>
        <span className="notif-icon">{notif.icon}</span>
      </div>
      <div className="notif-body">
        <strong className="notif-title">{notif.title}</strong>
        <p className="notif-desc">{notif.desc}</p>
        <small className="notif-time">{notif.time}</small>
      </div>
      {notif.unread && <span className="notif-dot" />}
    </div>
  );
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('Tất cả');

  const showPromo = activeTab === 'Tất cả' || activeTab === 'Khuyến mãi';
  const showOrder = activeTab === 'Tất cả' || activeTab === 'Đơn hàng';
  const showSystem = activeTab === 'Tất cả' || activeTab === 'Hệ thống';

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header />

      <main className="page-main notif-page">
        <div className="notif-header">
          <h1 className="notif-heading">Thông Báo Của Tôi 🔔</h1>
          <p className="notif-subheading">Cập nhật các chương trình khuyến mãi, trạng thái đơn hàng và tin tức mới nhất từ Original Fruits</p>
        </div>

        {/* Filter Tabs */}
        <div className="notif-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`notif-tab ${activeTab === tab ? 'notif-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Promo Section */}
        {showPromo && (
          <section className="notif-section">
            <h2 className="notif-section-title">ƯU ĐÃI &amp; KHUYẾN MÃI 🎉</h2>
            {NOTIFICATIONS.promo.map((n) => <NotifItem key={n.id} notif={n} />)}
          </section>
        )}

        {/* Order Section */}
        {showOrder && (
          <section className="notif-section">
            <h2 className="notif-section-title">TRẠNG THÁI ĐƠN HÀNG 📦</h2>
            {NOTIFICATIONS.order.map((n) => <NotifItem key={n.id} notif={n} />)}
          </section>
        )}

        {/* System Section */}
        {showSystem && (
          <section className="notif-section">
            <h2 className="notif-section-title">TIN TỨC &amp; HỆ THỐNG ⚙️</h2>
            {NOTIFICATIONS.system.map((n) => <NotifItem key={n.id} notif={n} />)}
          </section>
        )}
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
