'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header.jsx';
import { Hero } from '../components/Hero.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { ToastContainer } from '../components/Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { fallbackProducts, fetchProducts, formatCurrency } from '../services/productService.js';

export default function HomePageView() {
  const [products, setProducts] = useState(fallbackProducts);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { totalQuantity, addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetchProducts().then(({ data }) => {
      if (!mounted) return;
      setProducts(data);
      setLoadingProducts(false);
    });
    return () => { mounted = false; };
  }, []);

  const featuredProducts = products.slice(0, 4);

  const handleAddToCart = (product) => {
    if (!user) {
      setIsAuthOpen(true);
      addToast({ message: '🔒 Vui lòng đăng nhập để thêm vào giỏ hàng.', type: 'info', duration: 3000 });
      return;
    }
    addToCart(product);
    addToast({ message: `🛒 Đã thêm "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main>
        <Hero
          cartQuantity={totalQuantity}
          onShopNow={() => router.push('/menu')}
        />

        {/* Quick navigation cards */}
        <section className="section home-quicknav">
          <div className="section-heading center-heading">
            <span className="eyebrow">Khám phá</span>
            <h2>Bắt đầu từ đây</h2>
          </div>
          <div className="quicknav-grid">
            <a href="/menu" className="quicknav-card quicknav-menu">
              <span className="quicknav-icon">🧃</span>
              <div>
                <strong>Xem Menu</strong>
                <small>Trái cây, nước ép & combo</small>
              </div>
              <span className="quicknav-arrow">→</span>
            </a>
            <a href="/cart" className="quicknav-card quicknav-cart">
              <span className="quicknav-icon">🛒</span>
              <div>
                <strong>Giỏ hàng</strong>
                <small>{totalQuantity > 0 ? `${totalQuantity} sản phẩm đang chờ` : 'Giỏ hàng trống'}</small>
              </div>
              <span className="quicknav-arrow">→</span>
            </a>
            <a href="/rewards" className="quicknav-card quicknav-rewards">
              <span className="quicknav-icon">🎁</span>
              <div>
                <strong>Ưu đãi & Xu</strong>
                <small>Flash sale, voucher mùa hè</small>
              </div>
              <span className="quicknav-arrow">→</span>
            </a>
            <a href="/account" className="quicknav-card quicknav-account">
              <span className="quicknav-icon">👤</span>
              <div>
                <strong>Tài khoản</strong>
                <small>{user ? 'Quản lý đơn hàng' : 'Đăng nhập / Đăng ký'}</small>
              </div>
              <span className="quicknav-arrow">→</span>
            </a>
          </div>
        </section>

        {/* Flash Deals section */}
        <section className="section flash-deals-section">
          <div className="flash-deals-header">
            <div className="flash-title">
              <h2>⚡ FLASH SALE <span style={{ fontSize: '1.5rem', fontWeight: 400 }}>| MÙA HÈ</span></h2>
              <p>Chỉ còn vài giờ! Cơ hội săn deal sốc giảm đến 50%</p>
            </div>
            <div className="flash-timer">
              <div className="timer-box"><strong>02</strong><small>Giờ</small></div>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>:</span>
              <div className="timer-box"><strong>45</strong><small>Phút</small></div>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>:</span>
              <div className="timer-box"><strong>12</strong><small>Giây</small></div>
            </div>
          </div>
          
          <div className="flash-grid">
            {[
              { id: 'apple-juice-01', name: 'Green Glow Detox', image: '🍏', oldPrice: 39000, newPrice: 19000, sold: 85 },
              { id: 'mango-juice-01', name: 'Mango Sunrise', image: '🥭', oldPrice: 42000, newPrice: 21000, sold: 62 },
              { id: 'banana-01', name: 'Ruby Guava Sparkle', image: '🍐', oldPrice: 69000, newPrice: 34500, sold: 90 },
              { id: 'family-combo-01', name: 'Family Fresh Box', image: '🧺', oldPrice: 159000, newPrice: 99000, sold: 40 }
            ].map(deal => (
              <a href={`/product/${deal.id}`} className="flash-card" key={deal.id}>
                <span className="flash-badge">-50%</span>
                <div className="flash-image">{deal.image}</div>
                <h3>{deal.name}</h3>
                <div className="flash-prices">
                  <span className="price-new">{formatCurrency(deal.newPrice)}</span>
                  <span className="price-old">{formatCurrency(deal.oldPrice)}</span>
                </div>
                <div className="flash-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${deal.sold}%` }}></div>
                  </div>
                  <div className="progress-text">
                    <span>Đã bán {deal.sold}%</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Featured products preview */}
        <section className="section home-featured">
          <div className="section-heading">
            <span className="eyebrow">Nổi bật hôm nay</span>
            <h2>Sản phẩm bán chạy</h2>
            <p>Những lựa chọn được yêu thích nhất của cửa hàng.</p>
          </div>

          {loadingProducts ? (
            <div className="home-featured-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="home-product-card skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-content">
                    <div className="skeleton-line skeleton-line-short" />
                    <div className="skeleton-line" />
                    <div className="skeleton-btn" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="home-featured-grid">
              {featuredProducts.map((product) => (
                <article
                  key={product.id}
                  className="home-product-card"
                  style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}
                >
                  <a href={`/product/${product.id}`} className="home-product-image" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <span className="home-product-fruit">{product.image}</span>
                    <span className="home-product-leaf">{product.fruit}</span>
                  </a>
                  <div className="home-product-body">
                    <span className="home-product-badge">{product.badge}</span>
                    <a href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3>{product.name}</h3>
                    </a>
                    <p>{product.description}</p>
                    <div className="home-product-footer">
                      <strong>{formatCurrency(product.price)}<small>/{product.unit}</small></strong>
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => handleAddToCart(product)}
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="home-see-all">
            <a href="/menu" className="btn btn-ghost">
              Xem tất cả sản phẩm →
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026 - Website thương mại điện tử phong cách pastel.</span>
      </footer>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
