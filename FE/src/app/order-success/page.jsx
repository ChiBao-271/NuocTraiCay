'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { formatCurrency } from '../../services/productService.js';

export default function OrderSuccessPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('last_order');
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to parse order from sessionStorage');
      }
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!order) {
    return (
      <div className="site-shell page-shell">
        <div className="ambient ambient-one" />
        <Header cartQuantity={0} onLoginClick={() => router.push('/')} />
        <main className="page-main order-success-layout">
          <section className="panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2>Không tìm thấy thông tin đơn hàng</h2>
            <p>Có thể bạn chưa đặt hàng hoặc phiên làm việc đã hết hạn.</p>
            <button className="btn btn-primary" onClick={() => router.push('/')} style={{ marginTop: '1rem' }}>
              Quay lại trang chủ
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header cartQuantity={0} onLoginClick={() => {}} />

      <main className="page-main order-success-layout">
        <section className="panel success-hero-panel">
          <div className="success-icon-wrap">
            <span className="success-icon-check">✅</span>
            <div className="floating-fruit" style={{ animationDelay: '0s', top: '-10px', left: '-20px' }}>🍓</div>
            <div className="floating-fruit" style={{ animationDelay: '0.4s', top: '10px', right: '-30px' }}>🥝</div>
            <div className="floating-fruit" style={{ animationDelay: '0.8s', bottom: '-20px', left: '10px' }}>🍋</div>
          </div>
          <h1>Đặt hàng thành công!</h1>
          <p>
            Cảm ơn <strong>{order.customer.fullName}</strong> đã đặt hàng tại FreshFruit Shop.
            Chúng tôi sẽ sớm liên hệ để giao hàng.
          </p>
          <div className="order-id-badge">
            Mã đơn hàng: <strong>#{(order.order_code || order.id?.slice(0, 8))?.toUpperCase()}</strong>
          </div>
        </section>

        <section className="panel success-details-panel">
          <div className="success-grid">
            <div className="success-info-card">
              <h3>Thông tin giao hàng</h3>
              <ul>
                <li><strong>Người nhận:</strong> {order.customer.fullName}</li>
                <li><strong>Số điện thoại:</strong> {order.customer.phone}</li>
                <li><strong>Địa chỉ:</strong> {order.customer.address}</li>
                {order.customer.note && (
                  <li><strong>Ghi chú:</strong> {order.customer.note}</li>
                )}
              </ul>
            </div>

            <div className="success-items-card">
              <h3>Chi tiết sản phẩm</h3>
              <div className="success-items-list">
                {order.items.map((item) => (
                  <div className="success-item" key={item.id}>
                    <div className="success-item-visual">
                      <span className="success-item-icon">{item.image}</span>
                      <div className="success-item-meta">
                        <strong>{item.name}</strong>
                        <small>{item.quantity} x {formatCurrency(item.price)}</small>
                      </div>
                    </div>
                    <strong>{formatCurrency(item.quantity * item.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="success-total">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(order.total_amount)}</strong>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => router.push('/')}>
              Tiếp tục mua sắm
            </button>
            <button className="btn btn-ghost" onClick={() => router.push('/account')}>
              Xem đơn hàng của tôi
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
