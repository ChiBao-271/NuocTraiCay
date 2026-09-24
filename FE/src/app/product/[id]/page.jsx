'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../components/Header.jsx';
import { AuthModal } from '../../../components/AuthModal.jsx';
import { ToastContainer } from '../../../components/Toast.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useCart } from '../../../contexts/CartContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { fetchProducts, formatCurrency } from '../../../services/productService.js';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    fetchProducts().then(({ data }) => {
      if (!mounted) return;
      const found = data.find((p) => p.id === id);
      setProduct(found || null);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  const handleAddToCart = () => {
    if (!user) {
      setIsAuthOpen(true);
      addToast({ message: '🔒 Vui lòng đăng nhập để thêm vào giỏ hàng.', type: 'info', duration: 3000 });
      return;
    }
    
    // Add multiple quantities
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    addToast({ message: `🛒 Đã thêm ${quantity} "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  const handleBuyNow = () => {
    if (!user) {
      setIsAuthOpen(true);
      addToast({ message: '🔒 Vui lòng đăng nhập để mua hàng.', type: 'info', duration: 3000 });
      return;
    }
    
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
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

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main product-detail-layout">
        <button className="btn btn-ghost btn-back" onClick={() => router.back()}>
          ← Quay lại
        </button>

        <div className="product-detail-grid">
          {/* Visuals */}
          <section className="product-detail-visuals" style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}>
            <div className="product-detail-image-box">
              <span className="product-fruit fruit-a">{product.image}</span>
              <span className="product-fruit fruit-b">{product.fruit}</span>
              <div className="mini-bottle detail-bottle">
                <small>Fresh</small>
                <strong>{product.name.split(' ')[0]}</strong>
              </div>
            </div>
            
            <div className="product-benefits">
              <div className="benefit-card">
                <span>🌿</span>
                <small>100% Tự nhiên</small>
              </div>
              <div className="benefit-card">
                <span>🧊</span>
                <small>Ép lạnh</small>
              </div>
              <div className="benefit-card">
                <span>🛡️</span>
                <small>Không bảo quản</small>
              </div>
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
            
            <div className="product-detail-options">
              <div className="option-group">
                <label>Độ ngọt</label>
                <div className="radio-group">
                  <label><input type="radio" name="sweetness" defaultChecked /> <span>Bình thường</span></label>
                  <label><input type="radio" name="sweetness" /> <span>Ít ngọt</span></label>
                  <label><input type="radio" name="sweetness" /> <span>Không đường</span></label>
                </div>
              </div>
            </div>

            <div className="product-detail-actions">
              <div className="quantity-selector">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              
              <div className="action-buttons">
                <button className="btn btn-outline" type="button" onClick={handleAddToCart}>
                  + Thêm vào giỏ
                </button>
                <button className="btn btn-primary" type="button" onClick={handleBuyNow}>
                  Mua ngay
                </button>
              </div>
            </div>
            
            <div className="product-detail-delivery">
              <div className="delivery-row">
                <span>🚚</span>
                <div>
                  <strong>Giao hàng Hỏa tốc 2h</strong>
                  <small>Đảm bảo giữ lạnh tới tay bạn</small>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        {/* Related Products placeholder */}
        <section className="related-products">
          <h3>Có thể bạn sẽ thích</h3>
          <p>Xem thêm tại <a href="/menu" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Menu</a></p>
        </section>
      </main>

      {/* Floating cart button */}
      {totalQuantity > 0 && (
        <button
          className="floating-cart-btn"
          type="button"
          onClick={() => router.push('/cart')}
        >
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
