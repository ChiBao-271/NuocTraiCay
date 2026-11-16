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
import { categories, fetchAllProducts, normalizeVi, rankProductMatches } from '../../services/productService.js';

const FRUIT_GROUPS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tropical', label: 'Nhiệt đới' },
  { id: 'citrus', label: 'Có múi' },
  { id: 'berry', label: 'Berry' },
  { id: 'imported', label: 'Nhập khẩu' },
];

const FRUIT_KEYWORDS = {
  tropical: ['xoai', 'dua hau', 'thom', 'chuoi', 'mang cut', 'du du', 'thanh long', 'vai', 'chom chom', 'sapoche', 'mit'],
  citrus: ['buoi', 'cam', 'quyt', 'chanh', 'tac'],
  berry: ['dau', 'nho', 'viet quat', 'berry', 'cherry', 'blueberry', 'strawberry'],
};

const IMPORT_HINTS = ['my', 'uc', 'nhat', 'han quoc', 'new zealand', 'usa', 'nhap khau'];

function groupOf(product) {
  const name = normalizeVi(product.name);
  const origin = normalizeVi(product.origin);
  const standard = normalizeVi(product.farmingStandard);
  if (IMPORT_HINTS.some((hint) => origin.includes(hint) || standard.includes(hint))) return 'imported';
  for (const [group, keywords] of Object.entries(FRUIT_KEYWORDS)) {
    if (keywords.some((keyword) => name.includes(keyword))) return group;
  }
  return 'tropical';
}

function priceBounds(products) {
  if (!products.length) return { min: 0, max: 200000 };
  const values = products.map((product) => Number(product.price || 0));
  return { min: Math.min(...values), max: Math.max(...values) };
}

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const router = useRouter();
  const [dataSource, setDataSource] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [fruitFilter, setFruitFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [priceTouched, setPriceTouched] = useState(false);

  useEffect(() => {
    setSearchQuery(new URLSearchParams(window.location.search).get('search') || '');
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAllProducts()
      .then((rows) => {
        if (!mounted) return;
        setProducts(rows || []);
        setDataSource('api');
        setPriceRange(priceBounds(rows || []));
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setDataSource('unavailable');
        addToast({ message: 'Không tải được danh sách sản phẩm. Vui lòng thử tải lại.', type: 'error', duration: 5000 });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [addToast]);

  const bounds = useMemo(() => priceBounds(products), [products]);

  const origins = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => { if (product.origin) unique.add(product.origin); });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [products]);

  const searched = useMemo(() => {
    const term = searchQuery.trim();
    if (!term) return products;
    return rankProductMatches(products, term, products.length || 50);
  }, [products, searchQuery]);

  const filteredProducts = useMemo(() => {
    const min = priceTouched ? Math.min(priceRange.min, priceRange.max) : bounds.min;
    const max = priceTouched ? Math.max(priceRange.min, priceRange.max) : bounds.max;
    let list = searched.filter((product) => {
      if (activeCategory !== 'all' && product.category !== activeCategory) return false;
      if (fruitFilter !== 'all' && groupOf(product) !== fruitFilter) return false;
      if (originFilter !== 'all' && product.origin !== originFilter) return false;
      const price = Number(product.price || 0);
      if (priceTouched && (price < min || price > max)) return false;
      return true;
    });
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'new') list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else list = [...list].sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)) || Number(b.rating || 0) - Number(a.rating || 0));
    return list;
  }, [searched, activeCategory, fruitFilter, originFilter, sortBy, priceTouched, priceRange, bounds]);

  const resetFilters = () => {
    setActiveCategory('all');
    setFruitFilter('all');
    setOriginFilter('all');
    setSortBy('popular');
    setPriceTouched(false);
    setPriceRange(bounds);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    addToast({ message: `🛒 Đã thêm "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  const handleLoginRequired = () => {
    addToast({ message: 'Sản phẩm mẫu chưa có mã catalog hợp lệ nên chưa thể thêm vào giỏ.', type: 'info', duration: 3500 });
  };

  const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(value) || 0)) + 'đ';

  return (
    <div className="site-shell page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header onLoginClick={() => setIsAuthOpen(true)} />

      <main className="page-main">
        <div className="menu-banner">
          <div className="menu-banner-content">
            <span className="menu-banner-badge">MÙA NÀO THỨC ĐÓ</span>
            <h1 className="menu-banner-title">{searchQuery ? `Kết quả tìm kiếm: ${searchQuery}` : 'Vườn Trái Cây Nhiệt Đới Tươi Sạch'}</h1>
            <p className="menu-banner-desc">Cam kết 100% trái cây chín tự nhiên, không hóa chất bảo quản, thu hoạch trực tiếp từ các hợp tác xã hàng đầu Việt Nam và nhập khẩu chính ngạch.</p>
          </div>
          <div className="menu-banner-art">🍇🥭🍓</div>
        </div>

        <CategoryFilter categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />

        <div className="menu-layout-v2">
          <aside className="menu-sidebar-v2">
            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Phân Loại Trái Cây</h3>
              <ul className="menu-sidebar-list">
                {FRUIT_GROUPS.map((group) => (
                  <li key={group.id} className="menu-sidebar-item">
                    <label className={`menu-sidebar-label ${fruitFilter === group.id ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        className="menu-sidebar-check"
                        checked={fruitFilter === group.id}
                        onChange={() => setFruitFilter(group.id)}
                      />
                      <span>{group.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Khoảng Giá</h3>
              <div className="menu-price-range">
                <input
                  type="range"
                  className="menu-price-slider"
                  min={bounds.min}
                  max={bounds.max}
                  step={1000}
                  value={priceTouched ? priceRange.min : bounds.min}
                  onChange={(event) => {
                    setPriceTouched(true);
                    setPriceRange((current) => ({ ...current, min: Number(event.target.value) }));
                  }}
                  aria-label="Giá thấp nhất"
                />
                <input
                  type="range"
                  className="menu-price-slider"
                  min={bounds.min}
                  max={bounds.max}
                  step={1000}
                  value={priceTouched ? priceRange.max : bounds.max}
                  onChange={(event) => {
                    setPriceTouched(true);
                    setPriceRange((current) => ({ ...current, max: Number(event.target.value) }));
                  }}
                  aria-label="Giá cao nhất"
                />
                <div className="menu-price-labels">
                  <span>{formatPrice(priceTouched ? Math.min(priceRange.min, priceRange.max) : bounds.min)}</span>
                  <span>{formatPrice(priceTouched ? Math.max(priceRange.min, priceRange.max) : bounds.max)}</span>
                </div>
              </div>
            </div>

            <div className="menu-sidebar-section">
              <h3 className="menu-sidebar-title">Xuất Xứ</h3>
              <div className="menu-origin-pills">
                <button
                  type="button"
                  className={`menu-origin-pill ${originFilter === 'all' ? 'origin-active' : ''}`}
                  onClick={() => setOriginFilter('all')}
                >
                  Tất cả
                </button>
                {origins.map((origin) => (
                  <button
                    key={origin}
                    type="button"
                    className={`menu-origin-pill ${originFilter === origin ? 'origin-active' : ''}`}
                    onClick={() => setOriginFilter(originFilter === origin ? 'all' : origin)}
                  >
                    {origin}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="menu-filter-reset" onClick={resetFilters}>Xoá tất cả bộ lọc</button>
          </aside>

          <div className="menu-grid-area">
            <div className="menu-grid-header">
              <span>
                {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Tất Cả Trái Cây'} ({filteredProducts.length} sản phẩm)
              </span>
              <div className="menu-sort">
                <span>Sắp xếp:</span>
                <select className="menu-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="popular">Phổ Biến Nhất</option>
                  <option value="price-asc">Giá tăng dần</option>
                  <option value="price-desc">Giá giảm dần</option>
                  <option value="new">Mới nhất</option>
                </select>
              </div>
            </div>
            {!loading && filteredProducts.length === 0 ? (
              <div className="menu-empty-state">
                <p>Không có sản phẩm nào khớp bộ lọc hiện tại.</p>
                <button type="button" className="btn btn-ghost" onClick={resetFilters}>Xoá bộ lọc</button>
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                loading={loading}
                dataSource={dataSource}
                onAddToCart={handleAddToCart}
                onLoginRequired={handleLoginRequired}
              />
            )}
          </div>
        </div>
      </main>

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

