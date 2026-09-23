'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '../components/Header.jsx';
import { Hero } from '../components/Hero.jsx';
import { CategoryFilter } from '../components/CategoryFilter.jsx';
import { ProductGrid } from '../components/ProductGrid.jsx';
import { CartPanel } from '../components/CartPanel.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { CheckoutSection } from '../components/CheckoutSection.jsx';
import { ToastContainer } from '../components/Toast.jsx';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { categories, fallbackProducts, fetchProducts } from '../services/productService.js';

export default function HomePageView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState(fallbackProducts);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [dataSource, setDataSource] = useState('local');
  const [productError, setProductError] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const lastAddedRef = useRef(null);

  const { toasts, addToast, removeToast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize

    if (user) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
    setIsCartLoaded(true);
  }, [user, authLoading]);

  useEffect(() => {
    if (user && isCartLoaded) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cartItems));
    }
  }, [cartItems, user, isCartLoaded]);

  useEffect(() => {
    let mounted = true;

    fetchProducts().then(({ data, error, source }) => {
      if (!mounted) return;

      setProducts(data);
      setDataSource(source);
      setProductError(error?.message || '');
      setLoadingProducts(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((product) => product.category === activeCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, products]);

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  const rewardItems = products.slice(0, 3);

  const handleLoginRequired = () => {
    setIsAuthOpen(true);
    addToast({
      message: '🔒 Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.',
      type: 'info',
      duration: 3000,
    });
  };

  const handleAddToCart = (product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });

    // Track last added for CartPanel banner
    const addedEntry = { ...product, _addTime: Date.now() };
    setLastAdded(addedEntry);
    lastAddedRef.current = addedEntry;

    // Show toast notification
    addToast({
      message: `🛒 Đã thêm "${product.name}" vào giỏ hàng!`,
      type: 'cart',
      duration: 2800,
    });
  };

  const handleChangeQuantity = (productId, quantity) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) => (item.id === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header
        cartQuantity={totalQuantity}
        onLoginClick={() => setIsAuthOpen(true)}
      />

      <main>
        <Hero
          cartQuantity={totalQuantity}
          onShopNow={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
        />

        <section className="section web-preview-section" aria-label="Khối giao diện web mẫu">
          <div className="section-heading center-heading">
            <span className="eyebrow">Responsive web UI</span>
            <h2>Giao diện web lấy cảm hứng từ bản vẽ nước ép</h2>
            <p>
              Màu pastel, bo góc lớn, thẻ floating, thanh tab dưới và hiệu ứng trái cây bay
              được chuyển thành trải nghiệm website responsive.
            </p>
          </div>

          <div className="preview-gallery">
            <article className="preview-frame preview-voucher">
              <div className="preview-status"><span>9:41</span><span>●●●</span></div>
              <div className="preview-topbar"><button type="button">‹</button><strong>Ưu đãi</strong><button type="button">⌕</button></div>
              <div className="coin-card"><span>⭐</span><div><strong>1.250 Xu</strong><small>Hết hạn 31/12/2026</small></div><button type="button">Lịch sử</button></div>
              <div className="sale-banner"><small>FLASH SALE MÙA HÈ</small><strong>Giảm đến 50% toàn menu</strong><span>Áp dụng Citrus Punch và Green Glow</span></div>
              <div className="mission-row">
                {['Điểm danh', 'Đánh giá', 'Giới thiệu'].map((item, index) => <div key={item}><span>{['🎁', '💬', '👥'][index]}</span><strong>{item}</strong><small>+50 xu</small></div>)}
              </div>
              <div className="reward-grid">
                {rewardItems.map((item) => <div key={item.id}><span>{item.image}</span><strong>{item.name}</strong><button type="button">Đổi quà</button></div>)}
              </div>
              <div className="preview-tabbar"><span>⌂</span><span className="active">🎁 Rewards</span><span>🔔</span><span>♡</span></div>
            </article>

            <article className="preview-frame preview-notice">
              <div className="preview-status"><span>9:41</span><span>●●●</span></div>
              <div className="preview-topbar"><button type="button">‹</button><strong>Thông báo</strong><button type="button">⚙</button></div>
              {['Khuyến mãi', 'Đơn hàng', 'Hệ thống'].map((group, groupIndex) => (
                <div className="notice-block" key={group}>
                  <strong>{group}</strong>
                  {[0, 1].map((itemIndex) => <div className="notice-card" key={`${group}-${itemIndex}`}><span>{['🎟️', '🚚', '✨'][groupIndex]}</span><div><b>{groupIndex === 1 ? 'Đơn hàng đang được chuẩn bị' : 'Ưu đãi mới cho bạn'}</b><small>{itemIndex + 5} phút trước</small></div></div>)}
                </div>
              ))}
              <div className="preview-tabbar"><span>⌂</span><span>🛒</span><span className="active">🔔 Notification</span><span>♡</span></div>
            </article>

            <article className="preview-frame preview-profile">
              <div className="preview-status"><span>9:41</span><span>●●●</span></div>
              <h3>My Account</h3>
              <div className="profile-card"><span>👩🏻</span><div><strong>Maya Citrus 👋</strong><small>maya.citrus@freshjp.com</small></div><button type="button">✎</button></div>
              {['My Orders', 'Delivery Address', 'Payment Methods', 'Notifications', 'Help & Support', 'About Us'].map((item) => <div className="profile-link" key={item}><span>▣</span><strong>{item}</strong><small>›</small></div>)}
              <button className="logout-preview" type="button">↗ Log Out</button>
              <div className="preview-tabbar"><span>⌂</span><span>🛒</span><span>🔔</span><span className="active">Profile</span></div>
            </article>
          </div>
        </section>

        <section id="products" className="section section-products">
          <div className="section-heading">
            <span className="eyebrow">Fresh shop</span>
            <h2>Menu pastel cho website bán trái cây</h2>
            <p>
              Chọn nước ép, combo trái cây và đổi thưởng với layout thẻ mềm, hoạt ảnh nổi
              nhẹ phù hợp giao diện thương mại điện tử trên web.
            </p>
          </div>

          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />

          <ProductGrid
            products={filteredProducts}
            loading={loadingProducts}
            dataSource={dataSource}
            error={productError}
            onAddToCart={handleAddToCart}
            onLoginRequired={handleLoginRequired}
          />
        </section>

        <section className="section split-section">
          <CartPanel
            items={cartItems}
            total={cartTotal}
            onChangeQuantity={handleChangeQuantity}
            lastAdded={lastAdded}
          />
          <CheckoutSection
            cartItems={cartItems}
            cartTotal={cartTotal}
            onLoginClick={() => setIsAuthOpen(true)}
            onClearCart={handleClearCart}
          />
        </section>
      </main>

      <footer className="footer">
        <strong>FreshFruit Web Shop</strong>
        <span>© 2026 - Website thương mại điện tử phong cách pastel.</span>
      </footer>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      {/* Global toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
