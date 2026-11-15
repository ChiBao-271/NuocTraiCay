'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { formatCurrency } from '../../services/productService.js';

export default function OrderSuccessPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiptDate, setReceiptDate] = useState('');

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('last_order');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        setOrder(parsed);
        const date = parsed.created_at ? new Date(parsed.created_at) : new Date();
        setReceiptDate(new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date));
      } catch {
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
        {/* Stepper */}
        <div className="os-stepper">
          <div className="os-step os-step--done">
            <span className="os-step-check">✓</span>
            <span>Giỏ hàng</span>
          </div>
          <div className="os-step-line os-step-line--done" />
          <div className="os-step os-step--done">
            <span className="os-step-check">✓</span>
            <span>Thanh toán</span>
          </div>
          <div className="os-step-line os-step-line--done" />
          <div className="os-step os-step--done">
            <span className="os-step-check">✓</span>
            <span>Hoàn tất</span>
          </div>
        </div>

        {/* Success banner */}
        <section className="panel success-hero-panel">
          <div className="success-icon-wrap">
            <span className="success-icon-check">✅</span>
            <div className="floating-fruit" style={{ animationDelay: '0s', top: '-10px', left: '-20px' }}>🍓</div>
            <div className="floating-fruit" style={{ animationDelay: '0.4s', top: '10px', right: '-30px' }}>🥝</div>
            <div className="floating-fruit" style={{ animationDelay: '0.8s', bottom: '-20px', left: '10px' }}>🍋</div>
          </div>
          <h1>{order.payment_method === 'sepay' ? 'Đã tiếp nhận đơn hàng' : 'Đặt hàng thành công!'}</h1>
          <p>
            Cảm ơn <strong>{order.customer.fullName}</strong> đã đặt hàng tại FreshFruit Shop.{' '}
            {order.payment_method === 'sepay'
              ? 'Đơn đang chờ SePay xác nhận thanh toán. Trạng thái này chưa phải xác nhận đã trả tiền.'
              : 'Chúng tôi sẽ sớm liên hệ để giao hàng.'}
          </p>
          <div className="order-id-badge">
            Mã đơn hàng: <strong>#{(order.order_code || order.id?.slice(0, 8))?.toUpperCase()}</strong>
            {receiptDate && <small className="receipt-date">Ngày đặt: {receiptDate}</small>}
          </div>
          {order.payment_method === 'sepay' && <p className="form-status">Trạng thái thanh toán: đang chờ xác nhận</p>}
        </section>

        {/* Two-column details */}
        <section className="panel success-details-panel">
          <div className="os-two-col">
            {/* Left: order items */}
            <div className="os-col-items">
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
              <div className="receipt-breakdown">
                <div><span>Tạm tính</span><span>{formatCurrency(order.subtotal ?? order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))}</span></div>
                <div><span>Phí giao hàng</span><span>{Number(order.shipping_fee || 0) === 0 ? 'Miễn phí' : formatCurrency(order.shipping_fee)}</span></div>
                {Number(order.discount_amount || 0) > 0 && <div className="receipt-discount"><span>Giảm giá{order.voucher_code ? ` (${order.voucher_code})` : ''}</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
              </div>
              <div className="success-total">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(order.total_amount)}</strong>
              </div>
            </div>

            {/* Right: shipping & payment */}
            <div className="os-col-info">
              <h3>Thông tin giao hàng</h3>
              <ul className="os-info-list">
                <li><span>Người nhận</span><strong>{order.customer.fullName}</strong></li>
                <li><span>Số điện thoại</span><strong>{order.customer.phone}</strong></li>
                <li><span>Địa chỉ</span><strong>{order.customer.address}</strong></li>
                {order.customer.note && <li><span>Ghi chú</span><strong>{order.customer.note}</strong></li>}
              </ul>

              <h3 style={{ marginTop: '1.5rem' }}>Thông tin thanh toán</h3>
              <div className="receipt-payment-info">
                <div><span>Phương thức</span><strong>{order.payment_method === 'sepay' ? 'SePay · Chuyển khoản' : 'Thanh toán khi nhận hàng (COD)'}</strong></div>
                <div><span>Trạng thái</span><strong className={order.payment_method === 'sepay' ? 'receipt-pending' : 'receipt-unpaid'}>{order.payment_method === 'sepay' ? 'Đang chờ xác nhận' : 'Thanh toán khi nhận hàng'}</strong></div>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn btn-ghost" onClick={() => window.print()}>In / Lưu biên lai</button>
            <button className="btn btn-primary" onClick={() => router.push('/')}>
              Tiếp tục mua sắm
            </button>
            <button className="btn btn-ghost" onClick={() => router.push('/account')}>Xem đơn hàng của tôi</button>
          </div>
        </section>
      </main>
    </div>
  );
}
