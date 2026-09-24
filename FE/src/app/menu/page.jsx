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
import { useAuth } from '../../contexts/AuthContext.jsx';
import { categories, fallbackProducts, fetchProducts } from '../../services/productService.js';

export default function MenuPage() {
  const [products, setProducts] = useState(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const { addToCart, totalQuantity } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetchProducts().then(({ data }) => {
      if (!mounted) return;
      setProducts(data);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [activeCategory, products]);

  const handleAddToCart = (product) => {
    addToCart(product);
    addToast({ message: `🛒 Đã thêm "${product.name}" vào giỏ!`, type: 'cart', duration: 2500 });
  };

  const handleLoginRequired = () => {
    setIsAuthOpen(true);
    addToast({ message: '🔒 Vui lòng đăng nhập để mua hàng.', type: 'info', duration: 3000 });
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
