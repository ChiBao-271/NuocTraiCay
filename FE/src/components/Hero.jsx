'use client';

export function Hero({ onShopNow }) {
  return (
    <section id="top" className="hero-v2">
      {/* Decorative ambient elements */}
      <div className="hero-blob hero-blob-left" aria-hidden="true" />
      <div className="hero-blob hero-blob-right" aria-hidden="true" />
      <span className="hero-floating-fruit fruit-1">🍓</span>
      <span className="hero-floating-fruit fruit-2">🍃</span>
      <span className="hero-floating-fruit fruit-3">🍊</span>

      {/* Left: Main promo */}
      <div className="hero-v2-main">
        <span className="hero-v2-greeting">
          <span className="greeting-icon">✨</span>
          Good Morning, Fresh Friend
        </span>
        <h1>
          Get <span className="hero-v2-highlight">30% OFF</span><br />
          Your First Sip
        </h1>
        <p>
          Trải nghiệm dòng nước ép lạnh hữu cơ tinh khiết, ép tươi mỗi ngày giúp
          thanh lọc cơ thể và hồi phục năng lượng tức thì.
        </p>
        <div className="hero-v2-actions">
          <button className="btn btn-primary" type="button" onClick={onShopNow} id="hero-shop-now-btn">
            Đặt Hàng Ngay
          </button>
          <a className="btn btn-ghost" href="/menu" id="hero-explore-btn">
            Tìm Hiểu Thêm
          </a>
        </div>
      </div>

      {/* Right: Product spotlight card */}
      <div className="hero-v2-side">
        <a href="/menu?cat=juice" className="hero-promo-card" id="hero-promo-card">
          <div className="hero-promo-badge">BEST SELLER 🔥</div>
          <div className="hero-promo-content">
            <div>
              <h3>Zesty Passion Fruit<br />Zing! 20% OFF</h3>
              <p>Mã giảm giá: <strong>PASSIONFRUIT20</strong></p>
            </div>
            <div className="hero-promo-img">🍹</div>
          </div>
          <div className="hero-promo-glass" />
        </a>
      </div>
    </section>
  );
}
