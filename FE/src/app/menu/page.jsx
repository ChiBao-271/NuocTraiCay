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

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const router = useRouter();
  const [dataSource, setDataSource] = useState('loading');

  useEffect(() => {
    let mounted = true;
    fetchProducts()
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
  }, [addToast]);

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
        <div className="section-heading" style={{ padding: '2rem 0 0' }}>
          <span className="eyebrow">Fresh shop</span>
          <h1>Menu trái cây & nước ép</h1>
          <p>Chọn sản phẩm yêu thích — tươi ngon, giao nhanh.</p>
        </div>

        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          dataSource={dataSource}
          onAddToCart={handleAddToCart}
          onLoginRequired={handleLoginRequired}
        />
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
