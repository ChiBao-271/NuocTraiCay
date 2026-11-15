'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header.jsx';
import { CategoryFilter } from '../../components/CategoryFilter.jsx';
import { ProductGrid } from '../../components/ProductGrid.jsx';
import { AuthModal } from '../../components/AuthModal.jsx';
import { ToastContainer } from '../../components/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useCart } from '../../contexts/CartContext.jsx';
import { categories, fetchProducts } from '../../services/productService.js';

const SIDEBAR_CATEGORIES = ['Tất cả', 'Nhiệt đới', 'Có múi', 'Berry', 'Nhập khẩu'];
const ORIGINS = ['Việt Nam', 'Mỹ', 'Úc', 'Hàn Quốc', 'Nhật Bản'];

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeOrigin, setActiveOrigin] = useState('Việt Nam');
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const router = useRouter();
  const [dataSource, setDataSource] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery(new URLSearchParams(window.location.search).get('search') || '');
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProducts({ search: searchQuery })
      .then(({ data, source }) => {
        if (!mounted) return;
        setProducts(data || []);
        setDataSource(source || 'api');
        if (source === 'unavailable') addToast({ message: 'Chưa kết nối được catalog thật. Vui lòng thử tải lại sau.', type: 'error', duration: 5000 });
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setDataSource('unavailable');
        addToast({ message: 'Không tải được catalog. Vui lòng kiểm tra kết nối và thử lại.', type: 'error', duration: 5000 });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [addToast, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [activeCategory, products]);

  const handleAddToCart = (product) => {
    addToCart(product);
    addToast({ message: `🛒 Đã thêm "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  const handleLoginRequired = () => {
    addToast({ message: 'Sản phẩm mẫu chưa có mã catalog hợp lệ nên chưa thể thêm vào giỏ.', type: 'info', duration: 3500 });
  };

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main">
        {/* Top Banner */}
        <div className="menu-banner">
          <div className="menu-banner-content">
            <span className="menu-banner-badge">MÙA NÀO THỨC ĐÓ</span>
            <h1 className="menu-banner-title">{searchQuery ? `Kết quả tìm kiếm: ${searchQuery}` : 'Vườn Trái Cây Nhiệt Đới Tươi Sạch'}</h1>
            <p className="menu-banner-desc">Cam kết 100% trái cây chín tự nhiên, không hóa chất bảo quản, thu hoạch trực tiếp từ các hợp tác xã hàng đầu Việt Nam và nhập khẩu chính ngạch.</p>
          </div>
          <div className="menu-banner-art">🍇🥭🍓</div>
        </div>

        {/* Category pills */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        {/* Layout: sidebar + grid */}
        <div className="menu-layout-v2">
          {/* Sidebar */}
          <aside className="menu-sidebar-v2">
            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Phân Loại Trái Cây</h3>
              <ul className="menu-sidebar-list">
                {SIDEBAR_CATEGORIES.map((cat) => (
                  <li key={cat} className="menu-sidebar-item">
                    <label className="menu-sidebar-label">
                      <input type="checkbox" defaultChecked={cat === 'Tất cả'} className="menu-sidebar-check" />
                      {cat}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Khoảng Giá</h3>
              <div className="menu-price-range">
                <input type="range" min="30000" max="150000" defaultValue="150000" className="menu-price-slider" />
                <div className="menu-price-labels">
                  <span>30.000đ</span>
                  <span>150.000đ</span>
                </div>
              </div>
            </div>

            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Xuất Xứ</h3>
              <div className="menu-origin-pills">
                {ORIGINS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`menu-origin-pill ${activeOrigin === o ? 'origin-active' : ''}`}
                    onClick={() => setActiveOrigin(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="menu-grid-area">
            <div className="menu-grid-header">
              <span>Tất Cả Trái Cây ({filteredProducts.length} sản phẩm)</span>
              <div className="menu-sort">
                <span>Sắp xếp:</span>
                <select className="menu-sort-select" defaultValue="popular">
                  <option value="popular">Phổ Biến Nhất</option>
                  <option value="price-asc">Giá tăng dần</option>
                  <option value="price-desc">Giá giảm dần</option>
                  <option value="new">Mới nhất</option>
                </select>
              </div>
            </div>
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              dataSource={dataSource}
              onAddToCart={handleAddToCart}
              onLoginRequired={handleLoginRequired}
            />
          </div>
        </div>
      </main>

      {/* Floating cart button */}
      {totalQuantity > 0 && (
        <button
          className="floating-cart-btn"
          type="button"
          onClick={() => router.push('/cart')}
          aria-label={`Xem giỏ hàng (${totalQuantity} sản phẩm)`}
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
