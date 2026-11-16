'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header.jsx';
import { AuthModal } from '../../../components/AuthModal.jsx';
import { ToastContainer } from '../../../components/Toast.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useCart } from '../../../contexts/CartContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { getProductById, formatCurrency } from '../../../services/productService.js';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeWeight, setActiveWeight] = useState('350ml');

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    getProductById(id).then(({ data }) => {
      if (!mounted) return;
      setProduct(data || null);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, quantity);

    addToast({ message: `🛒 Đã thêm ${quantity} "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    if (!user) {
      addToast({ message: 'Đã lưu sản phẩm vào giỏ. Đăng nhập để tiếp tục đặt hàng.', type: 'info', duration: 3000 });
      router.push('/login?next=/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="site-shell page-shell">
        <Header onLoginClick={() => setIsAuthOpen(true)} />
        <main className="page-main" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h2>Đang tải thông tin sản phẩm...</h2>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="site-shell page-shell">
        <Header onLoginClick={() => setIsAuthOpen(true)} />
        <main className="page-main" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h2>Không tìm thấy sản phẩm</h2>
          <button className="btn btn-primary" onClick={() => router.push('/menu')} style={{ marginTop: '1rem' }}>
            Quay lại Menu
          </button>
        </main>
      </div>
    );
  }

  const isDrink = product.category === 'juice' || product.category === 'smoothie';
  const WEIGHT_OPTIONS = isDrink ? ['250ml', '350ml', '500ml'] : [product.unit || 'kg'];
  const currentWeight = isDrink ? activeWeight : (product.unit || 'kg');

  const REVIEWS = [
    { name: 'Nguyễn Minh Anh', stars: 5, date: '05/11/2026', text: 'Nước ép rất ngon, tươi mát và nguyên chất. Giao hàng nhanh, đóng gói cẩn thận. Sẽ ủng hộ tiếp!' },
    { name: 'Trần Hoàng Nam', stars: 4, date: '03/11/2026', text: 'Vị ngon, không quá ngọt. Lần sau sẽ thử ít ngọt hơn xem thế nào. Chất lượng ổn so với giá tiền.' },
  ];

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main product-detail-layout">
        {/* Breadcrumb */}
        <nav className="pd-breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/menu">Trái Cây Tươi</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail-grid">
          {/* Visuals */}
          <section className="product-detail-visuals" style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}>
            <div className="product-detail-image-box">
              {product.imageUrl
                ? <img className="product-detail-photo" src={product.imageUrl} alt={product.name} />
                : <><span className="product-fruit fruit-a">{product.image}</span><span className="product-fruit fruit-b">{product.fruit}</span><div className="mini-bottle detail-bottle"><small>Fresh</small><strong>{product.name.split(' ')[0]}</strong></div></>}
            </div>

            <div className="product-benefits">
              <div className="benefit-card"><span>🌿</span><small>100% Tự nhiên</small></div>
              <div className="benefit-card"><span>{isDrink ? '🧊' : '🌤️'}</span><small>{isDrink ? 'Ép lạnh' : 'Thu hoạch mới'}</small></div>
              <div className="benefit-card"><span>🛡️</span><small>Không bảo quản</small></div>
            </div>
          </section>

          {/* Info */}
          <section className="product-detail-info">
            <span className="product-detail-badge">{product.badge || 'Tươi ngon'}</span>
            <h1>{product.name}</h1>
            <div className="product-detail-meta">
              <span className="rating">⭐ 4.9 (128 đánh giá)</span>
              <span className="divider">•</span>
              <span className="sold">Đã bán 1.2k</span>
            </div>

            <div className="product-detail-price-box">
              <h2 className="product-detail-price">{formatCurrency(product.price)}</h2>
              <span className="product-detail-unit">/ {product.unit}</span>
            </div>

            <p className="product-detail-desc">{product.description}</p>

            {/* Đồ uống: chọn dung tích. Trái cây/combo: mô tả ngắn thay cho khối lượng */}
            {isDrink ? (
            <div className="pd-weight-section">
              <label className="pd-option-label">Dung tích</label>
              <div className="pd-weight-pills">
                {WEIGHT_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`pd-weight-pill ${currentWeight === w ? 'pd-weight-pill--active' : ''}`}
                    onClick={() => setActiveWeight(w)}
                  >{w}</button>
                ))}
              </div>
            </div>
            ) : (
              <div className="pd-short-note">
                <p>{product.category === 'combo'
                  ? 'Combo tiện lợi, dùng ngon nhất trong 2 ngày sau khi nhận.'
                  : 'Trái cây tươi hái trong ngày, ngon nhất khi dùng sớm.'}</p>
                <div className="pd-short-note-chips">
                  {product.origin && <span>📍 {product.origin}</span>}
                  {product.farmingStandard && <span>🌿 {product.farmingStandard}</span>}
                  <span>🧊 Bảo quản ngăn mát 3–5 ngày</span>
                  <span>💧 Rửa sạch trước khi dùng</span>
                </div>
              </div>
            )}

            {/* Sweetness */}
            <div className={'product-detail-options' + (isDrink ? '' : ' pd-hide')}>
              <div className="option-group">
                <label>Độ ngọt</label>
                <div className="radio-group">
                  <label><input type="radio" name="sweetness" defaultChecked /> <span>Bình thường</span></label>
                  <label><input type="radio" name="sweetness" /> <span>Ít ngọt</span></label>
                  <label><input type="radio" name="sweetness" /> <span>Không đường</span></label>
                </div>
              </div>
            </div>

            {/* Nutrition bar */}
            <div className="pd-nutrition">
              <div className="pd-nutrition-title">Thông tin dinh dưỡng <small>(mỗi {product.unit})</small></div>
              <div className="pd-nutrition-bars">
                <div className="pd-nutr-item">
                  <span>Calories</span>
                  <div className="pd-nutr-bar-wrap"><div className="pd-nutr-bar" style={{ width: '48%', background: '#f97316' }} /></div>
                  <span className="pd-nutr-val">60 kcal</span>
                </div>
                <div className="pd-nutr-item">
                  <span>Vitamin C</span>
                  <div className="pd-nutr-bar-wrap"><div className="pd-nutr-bar" style={{ width: '72%', background: '#22c55e' }} /></div>
                  <span className="pd-nutr-val">36mg</span>
                </div>
                <div className="pd-nutr-item">
                  <span>Đường</span>
                  <div className="pd-nutr-bar-wrap"><div className="pd-nutr-bar" style={{ width: '55%', background: '#3b82f6' }} /></div>
                  <span className="pd-nutr-val">14g</span>
                </div>
                <div className="pd-nutr-item">
                  <span>Chất xơ</span>
                  <div className="pd-nutr-bar-wrap"><div className="pd-nutr-bar" style={{ width: '20%', background: '#a855f7' }} /></div>
                  <span className="pd-nutr-val">1.6g</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="product-detail-actions">
              <div className="quantity-selector">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <div className="action-buttons">
                <button className="btn btn-outline" type="button" onClick={handleAddToCart}>+ Thêm vào giỏ</button>
                <button className="btn btn-primary" type="button" onClick={handleBuyNow}>Mua ngay</button>
              </div>
            </div>

            <div className="product-detail-delivery">
              <div className="delivery-row">
                <span>🚚</span>
                <div>
                  <strong>Giao hàng Hỏa tốc 2h</strong>
                  <small>{isDrink ? 'Đảm bảo giữ lạnh tới tay bạn' : 'Đóng gói cẩn thận, giao trong ngày'}</small>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Customer Reviews */}
        <section className="pd-reviews">
          <h3 className="pd-reviews-title">Đánh giá khách hàng ⭐</h3>
          <div className="pd-reviews-summary">
            <div className="pd-reviews-score">4.9</div>
            <div>
              <div className="pd-reviews-stars">⭐⭐⭐⭐⭐</div>
              <small>128 đánh giá</small>
            </div>
          </div>
          <div className="pd-reviews-list">
            {REVIEWS.map((r, i) => (
              <div key={i} className="pd-review-item">
                <div className="pd-review-header">
                  <div className="pd-review-avatar">{r.name[0]}</div>
                  <div>
                    <strong>{r.name}</strong>
                    <div className="pd-review-stars">{'⭐'.repeat(r.stars)}</div>
                  </div>
                  <small className="pd-review-date">{r.date}</small>
                </div>
                <p className="pd-review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related products */}
        <section className="related-products">
          <h3>Có thể bạn sẽ thích</h3>
          <p>Xem thêm tại <a href="/menu" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Menu trái cây & nước ép</a></p>
        </section>
      </main>

      {totalQuantity > 0 && (
        <button className="floating-cart-btn" type="button" onClick={() => router.push('/cart')}>
          🛒 Xem giỏ hàng · <strong>{totalQuantity}</strong>
        </button>
      )}

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026</span>
      </footer>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
