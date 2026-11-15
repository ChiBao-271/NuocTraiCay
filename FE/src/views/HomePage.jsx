'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header.jsx';
import { Hero } from '../components/Hero.jsx';
import { ToastContainer } from '../components/Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Link from 'next/link';
import { fetchProducts, formatCurrency } from '../services/productService.js';

const CATEGORY_PILLS = [
  { id: 'all', label: 'Tất cả', icon: '🌿' },
  { id: 'juice', label: 'Nước ép', icon: '🍊' },
  { id: 'smoothie', label: 'Sinh tố', icon: '🥤' },
  { id: 'fresh-fruit', label: 'Trái cây tươi', icon: '🍍' },
  { id: 'combo', label: 'Combo', icon: '🧺' },
];

const BADGE_COLORS = {
  'Bán chạy': 'badge-orange',
  'Mới': 'badge-green',
  'BEST SELLER': 'badge-orange',
  'CITRUS SEASON': 'badge-green',
  'DẶNG NHIỆT ĐỚI': 'badge-red',
  'SUPER DETOX': 'badge-blue',
  'Ngọt dịu': 'badge-yellow',
  'Tươi trong ngày': 'badge-green',
  'Giá tốt': 'badge-orange',
  'Mọng nước': 'badge-red',
  'Tiết kiệm': 'badge-blue',
  'Đặt nhóm': 'badge-blue',
};

function getBadgeClass(badge) {
  if (!badge) return 'badge-orange';
  const lower = badge.toLowerCase();
  if (lower.includes('chạy') || lower.includes('best') || lower.includes('ngọt')) return 'badge-orange';
  if (lower.includes('mới') || lower.includes('citrus') || lower.includes('tươi')) return 'badge-green';
  if (lower.includes('nhiệt') || lower.includes('mọng')) return 'badge-red';
  if (lower.includes('detox') || lower.includes('tiết') || lower.includes('nhóm')) return 'badge-blue';
  return 'badge-orange';
}

export default function HomePageView() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [activePill, setActivePill] = useState(0);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, isCartLoaded } = useCart();
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    fetchProducts()
      .then(({ data, source, error }) => {
        if (!mounted) return;
        setProducts(data || []);
        setCatalogError(source === 'unavailable' ? (error?.message || 'Backend không trả được danh sách sản phẩm.') : '');
        if (source === 'unavailable') addToast({ message: 'Không tải được catalog thật. Admin có thể mở quản trị và thử tải lại sản phẩm.', type: 'error', duration: 9000 });
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        addToast({ message: 'Không tải được catalog. Vui lòng thử tải lại.', type: 'error', duration: 5000 });
      })
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });
    return () => { mounted = false; };
  }, [addToast, catalogRetry]);

  const activeCat = CATEGORY_PILLS[activePill]?.id ?? 'all';
  const filteredProducts = activeCat === 'all'
    ? products
    : products.filter(p => p.category === activeCat);

  const bestSellers = [...filteredProducts]
    .sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)))
    .slice(0, 4);
  const freshFruits = products.filter(p => p.category === 'fresh-fruit').slice(0, 4);
  const displayFresh = freshFruits;

  const handleAddToCart = (product) => {
    if (!isCartLoaded) return;
    if (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity < 1) {
      addToast({ message: 'Sản phẩm hiện đã hết hàng.', type: 'error', duration: 2800 });
      return;
    }
    addToCart(product);
    addToast({ message: `🛒 Đã thêm "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header />

      <main>
        {/* ── Hero ── */}
        <Hero onShopNow={() => router.push('/menu')} />

        {/* ── Khám Phá Hương Vị ── */}
        <section className="section home-discover">
          <div className="section-heading">
            <h2>Khám Phá Hương Vị</h2>
            <p>Lựa chọn các nhóm hương vị trái cây yêu thích của bạn</p>
          </div>
          <div className="category-pills">
            {CATEGORY_PILLS.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                className={`category-pill ${activePill === idx ? 'pill-active' : ''}`}
                onClick={() => setActivePill(idx)}
                id={`category-pill-${idx}`}
              >
                <span>{pill.icon}</span>
                {pill.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Sản Phẩm Bán Chạy ── */}
        <section className="section home-bestseller">
          <div className="section-heading-row">
            <div>
              <h2>Sản Phẩm Bán Chạy 🔥</h2>
              <p>Những ly nước ép tuyệt phẩm được lựa chọn nhiều nhất ngày hôm nay</p>
            </div>
            <Link href="/menu" className="btn btn-ghost btn-sm" id="home-see-all-btn">Xem tất cả &rsaquo;</Link>
          </div>
          {!loadingProducts && products.length === 0 && (
            <div className="panel admin-home-catalog-alert" role="status">
              <strong>Catalog chưa tải được sản phẩm.</strong>
              <p>{catalogError || 'Chưa có sản phẩm đang bật bán trong catalog.'}</p>
              <button type="button" className="btn btn-ghost" onClick={() => setCatalogRetry((attempt) => attempt + 1)} disabled={loadingProducts}>Thử tải lại catalog</button>
              {userRole === 'admin' && <Link href="/admin/products" className="btn btn-primary">Mở quản lý sản phẩm</Link>}
            </div>
          )}

          {loadingProducts ? (
            <div className="home-product-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="hp-card skeleton-card">
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
            <div className="home-product-grid">
              {bestSellers.map((product) => (
                <article key={product.id || product.name} className="hp-card">
                  {product.badge && (
                    <span className={`hp-badge ${getBadgeClass(product.badge)}`}>
                      {product.badge.toUpperCase()}
                    </span>
                  )}
                  {product.id ? <Link href={`/product/${product.id}`} className="hp-img-wrap">{product.imageUrl ? <img className="hp-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="hp-emoji">{product.image}</span><span className="hp-emoji-sub">{product.fruit}</span></>}</Link> : <div className="hp-img-wrap">{product.imageUrl ? <img className="hp-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="hp-emoji">{product.image}</span><span className="hp-emoji-sub">{product.fruit}</span></>}</div>}
                  <div className="hp-body">
                    {product.id ? <Link href={`/product/${product.id}`} className="hp-name">{product.name}</Link> : <strong className="hp-name">{product.name}</strong>}
                    <p className="hp-desc">{product.description}</p>
                    <div className="hp-footer">
                      <div>
                        <strong className="hp-price">{formatCurrency(product.price)}</strong>
                        <small className="hp-unit">/{product.unit}</small>
                      </div>
                      <button
                        className="hp-add-btn"
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={!isCartLoaded || !product.id}
                        id={`add-cart-hp-${product.id}`}
                        aria-label={`Thêm ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Trái Cây Tươi Hôm Nay ── */}
        <section className="section home-fresh">
          <div className="section-heading-row">
            <div>
              <h2>Trái Cây Tươi Hôm Nay 🔥</h2>
              <p>Trái cây tươi ngon, được chọn lọc kỹ càng và cập nhật mỗi ngày</p>
            </div>
            <Link href="/menu" className="btn btn-ghost btn-sm" id="home-fresh-see-all-btn">Xem tất cả &rsaquo;</Link>
          </div>

          {loadingProducts ? (
            <div className="home-product-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="hp-card skeleton-card">
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
            <div className="home-product-grid">
              {displayFresh.map((product) => (
                <article key={product.id || product.name} className="hp-card">
                  {product.badge && (
                    <span className={`hp-badge ${getBadgeClass(product.badge)}`}>
                      {product.badge.toUpperCase()}
                    </span>
                  )}
                  {product.id ? <Link href={`/product/${product.id}`} className="hp-img-wrap hp-img-wrap--fruit">{product.imageUrl ? <img className="hp-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="hp-emoji">{product.image}</span><span className="hp-emoji-sub">{product.fruit}</span></>}</Link> : <div className="hp-img-wrap hp-img-wrap--fruit">{product.imageUrl ? <img className="hp-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="hp-emoji">{product.image}</span><span className="hp-emoji-sub">{product.fruit}</span></>}</div>}
                  <div className="hp-body">
                    {product.id ? <Link href={`/product/${product.id}`} className="hp-name">{product.name}</Link> : <strong className="hp-name">{product.name}</strong>}
                    <p className="hp-desc">{product.description}</p>
                    <div className="hp-footer">
                      <div>
                        <strong className="hp-price">{formatCurrency(product.price)}</strong>
                        <small className="hp-unit">/{product.unit}</small>
                      </div>
                      <button
                        className="hp-add-btn"
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={!isCartLoaded || !product.id}
                        id={`add-cart-fresh-${product.id}`}
                        aria-label={`Thêm ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ══════════════════════════════════════
          FOOTER V2 — Premium redesign
      ══════════════════════════════════════ */}
      <footer className="footer-v2">

        {/* Decorative ambient blobs */}
        <div className="footer-blob footer-blob-a" aria-hidden="true" />
        <div className="footer-blob footer-blob-b" aria-hidden="true" />

        {/* CTA Strip — newsletter */}
        <div className="footer-cta-strip">
          <div className="footer-cta-text">
            <span className="footer-cta-badge">🎁 Ưu đãi thành viên</span>
            <h3>Nhận ngay <strong>voucher 20%</strong> cho lần đầu đặt hàng</h3>
          </div>
          <form className="footer-cta-form" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="Nhập email của bạn..."
              className="footer-cta-input"
              aria-label="Email nhận ưu đãi"
            />
            <button type="submit" className="footer-cta-btn">
              Nhận ngay →
            </button>
          </form>
        </div>

        {/* Main columns */}
        <div className="footer-v2-inner">

          {/* Brand column */}
          <div className="footer-brand-col">
            <div className="footer-logo">
              <span className="footer-logo-icon">🍊</span>
              <div>
                <strong>Original Fruits</strong>
                <small>Juice shop &amp; rewards</small>
              </div>
            </div>
            <p>Nước ép trái cây tươi nguyên chất 100% tự nhiên, ép lạnh trong ngày mang lại nguồn dinh dưỡng tinh khiết nhất cho bạn.</p>
            <div className="footer-trust-badges">
              <span className="footer-badge">🌿 100% Organic</span>
              <span className="footer-badge">❄️ Ép lạnh</span>
              <span className="footer-badge">🚚 Giao nhanh 2h</span>
            </div>
          </div>

          {/* About links */}
          <div className="footer-links-col">
            <h4>Về Chúng Tôi</h4>
            <ul>
              <li><a href="/about">Câu chuyện thương hiệu</a></li>
              <li><a href="/about#origin">Nguồn nguyên liệu</a></li>
              <li><a href="/about#process">Quy trình ép lạnh</a></li>
              <li><a href="/careers">Tuyển dụng</a></li>
            </ul>
          </div>

          {/* Support links */}
          <div className="footer-links-col">
            <h4>Hỗ Trợ</h4>
            <ul>
              <li><a href="/shipping">Chính sách giao hàng</a></li>
              <li><a href="/returns">Đổi trả &amp; Hoàn tiền</a></li>
              <li><a href="/faq">Câu hỏi thường gặp</a></li>
              <li><a href="/contact">Liên hệ hỗ trợ</a></li>
            </ul>
          </div>

          {/* Social + Hotline */}
          <div className="footer-social-col">
            <h4>Kết Nối Với Chúng Tôi</h4>
            <div className="footer-socials">
              <a href="#" className="footer-social-btn" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="TikTok">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.87a8.18 8.18 0 0 0 4.78 1.52V7.01a4.85 4.85 0 0 1-1.01-.32z"/></svg>
              </a>
            </div>
            <div className="footer-hotline">
              <span className="footer-hotline-icon">📞</span>
              <div>
                <small>Hotline hỗ trợ 7:00 – 22:00</small>
                <strong>1900 - 2345</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-v2-bottom">
          <div className="footer-bottom-left">
            <span>© 2026 Original Fruits.</span>
            <span className="footer-made">Made with 🍊 in Vietnam</span>
          </div>
          <div className="footer-bottom-right">
            <a href="/terms">Điều khoản dịch vụ</a>
            <span className="footer-sep">·</span>
            <a href="/privacy">Chính sách bảo mật</a>
            <span className="footer-sep">·</span>
            <a href="/cookies">Cookie</a>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
