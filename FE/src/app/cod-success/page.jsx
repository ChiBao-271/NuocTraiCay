'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { formatCurrency } from '../../services/productService.js';

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Vừa đặt xong';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

export default function CodSuccessPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('last_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.payment_method === 'cod' && Array.isArray(parsed.items)) setOrder(parsed);
      }
    } catch {
      setOrder(null);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!order) {
    return (
      <div className="site-shell page-shell cod-success-shell">
        <Header cartQuantity={0} onLoginClick={() => router.push('/')} />
        <main className="cod-success-main">
          <section className="cod-receipt cod-receipt-empty">
            <h1>Chưa có đơn COD để hiển thị</h1>
            <p>Biên lai này chỉ mở ngay sau khi bạn đặt đơn thanh toán khi nhận hàng.</p>
            <button className="cod-primary-button" onClick={() => router.push('/menu')}>Quay lại cửa hàng</button>
          </section>
        </main>
      </div>
    );
  }

  const orderCode = order.order_code || order.id?.slice(0, 8)?.toUpperCase() || '—';
  const subtotal = Number(order.subtotal ?? order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
  const shipping = Number(order.shipping_fee || 0);
  const discount = Number(order.discount_amount || 0);

  return (
    <div className="site-shell page-shell cod-success-shell">
      <div className="ambient ambient-one" />
      <Header cartQuantity={0} onLoginClick={() => router.push('/')} />
      <main className="cod-success-main">
        <nav className="cod-steps" aria-label="Tiến trình đặt hàng">
          <span className="is-complete"><i>✓</i> Giỏ hàng</span><b />
          <span className="is-complete"><i>✓</i> Thanh toán</span><b />
          <span className="is-current"><i>3</i> Hoàn tất</span>
        </nav>

        <section className="cod-receipt">
          <div className="cod-success-mark"><span>✓</span></div>
          <p className="cod-eyebrow">ĐẶT HÀNG THÀNH CÔNG</p>
          <h1>Cảm ơn bạn đã đặt hàng!</h1>
          <p className="cod-intro">Đơn hàng đã được tiếp nhận. Bạn sẽ thanh toán khi nhận được hàng.</p>

          <div className="cod-order-meta">
            <div><span>Mã đơn hàng</span><strong>{orderCode}</strong></div>
            <div><span>Ngày đặt</span><strong>{formatDate(order.created_at)}</strong></div>
            <div><span>Thanh toán</span><strong>Thanh toán khi nhận hàng (COD)</strong></div>
            <div><span>Trạng thái</span><strong className="cod-status">Đang chờ xác nhận</strong></div>
          </div>

          <div className="cod-receipt-columns">
            <section className="cod-receipt-section cod-products">
              <h2>Sản phẩm đã đặt</h2>
              <div className="cod-items">
                {order.items.map((item, index) => (
                  <article className="cod-item" key={`${item.id || item.product_id || 'item'}-${index}`}>
                    <div className="cod-item-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{item.image || '🍊'}</span>}</div>
                    <div className="cod-item-description"><strong>{item.name || item.product_name}</strong><small>{item.quantity} × {formatCurrency(item.price ?? item.unit_price)}</small></div>
                    <strong className="cod-item-price">{formatCurrency(Number(item.quantity) * Number(item.price ?? item.unit_price))}</strong>
                  </article>
                ))}
              </div>
              <div className="cod-totals">
                <div><span>Tạm tính</span><span>{formatCurrency(subtotal)}</span></div>
                <div><span>Phí giao hàng</span><span>{shipping ? formatCurrency(shipping) : 'Miễn phí'}</span></div>
                {discount > 0 && <div className="cod-discount"><span>Ưu đãi{order.voucher_code ? ` (${order.voucher_code})` : ''}</span><span>−{formatCurrency(discount)}</span></div>}
                <div className="cod-grand-total"><strong>Tổng thanh toán</strong><strong>{formatCurrency(order.total_amount)}</strong></div>
              </div>
            </section>

            <section className="cod-receipt-section cod-delivery">
              <h2>Thông tin nhận hàng</h2>
              <dl>
                <div><dt>Người nhận</dt><dd>{order.customer?.fullName || '—'}</dd></div>
                <div><dt>Số điện thoại</dt><dd>{order.customer?.phone || '—'}</dd></div>
                <div><dt>Địa chỉ giao hàng</dt><dd>{order.customer?.address || '—'}</dd></div>
                {order.customer?.note && <div><dt>Ghi chú</dt><dd>{order.customer.note}</dd></div>}
              </dl>
              <div className="cod-cash-note"><span>💵</span><p><strong>Chưa cần thanh toán bây giờ</strong><br />Chuẩn bị {formatCurrency(order.total_amount)} để thanh toán khi đơn hàng được giao.</p></div>
            </section>
          </div>

          <div className="cod-actions">
            <button className="cod-primary-button" onClick={() => router.push('/account')}>Theo dõi đơn hàng</button>
            <button className="cod-secondary-button" onClick={() => window.print()}>In / Lưu biên lai</button>
            <button className="cod-link-button" onClick={() => router.push('/menu')}>Tiếp tục mua sắm</button>
          </div>
          <p className="cod-help">Cần hỗ trợ? Vui lòng liên hệ cửa hàng và cung cấp mã đơn {orderCode}.</p>
        </section>
      </main>
    </div>
  );
}
