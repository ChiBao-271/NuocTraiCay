export function Hero({ onShopNow, cartQuantity }) {
  return (
    <section id="top" className="hero">
      <div className="hero-content">
        <span className="eyebrow">Fruit juice web redesign</span>
        <h1>Website bán trái cây phong cách nước ép pastel</h1>
        <p>
          Giao diện website được làm lại theo phong cách bản vẽ bạn gửi: bố cục hiện đại,
          nền xanh dịu, chai nước ép nổi, voucher, hồ sơ khách hàng và giỏ hàng có hiệu ứng.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onShopNow}>
            Mua ngay
          </button>
          <a className="btn btn-ghost" href="#checkout">
            Xem thanh toán
          </a>
        </div>
        <div className="stats-grid">
          <div>
            <strong>9:41</strong>
            <span>Website UI style</span>
          </div>
          <div>
            <strong>{cartQuantity}</strong>
            <span>Sản phẩm trong giỏ</span>
          </div>
          <div>
            <strong>50%</strong>
            <span>Voucher mùa hè</span>
          </div>
        </div>
      </div>
      <div className="hero-showcase-wrap" aria-label="Minh họa website bán nước ép">
        <div className="floating-fruit fruit-one">🍓</div>
        <div className="floating-fruit fruit-two">🍃</div>
        <div className="floating-fruit fruit-three">🥭</div>
        <article className="hero-showcase-card">
          <div className="preview-status"><span>9:41</span><span>▮▮▮</span></div>
          <div className="shop-toolbar"><button type="button">☰</button><button type="button">🛒</button></div>
          <div className="bottle-stage">
            <span className="fruit-piece piece-left">🍓</span>
            <span className="fruit-piece piece-right">🍃</span>
            <div className="juice-bottle">
              <span>Original Fruits</span>
              <strong>DÂU TÂY</strong>
            </div>
          </div>
          <div className="preview-product-copy">
            <div>
              <h2>Sparkling Strawberry Orchard</h2>
              <p>Pure fresh strawberries selected from organic farms.</p>
            </div>
            <strong>$4.49 <small>(350ml)</small></strong>
          </div>
          <h3>Signature Dishes</h3>
          <div className="dish-strip">
            {['🍝', '🥗', '🍮'].map((dish, index) => <span key={dish}>{dish}<small>{index === 0 ? 'Truffle' : index === 1 ? 'Burrata' : 'Tiramisu'}</small></span>)}
          </div>
          <div className="preview-tabbar"><span>⌂</span><span className="active">🎁 Rewards</span><span>🔔</span><span>♡</span></div>
        </article>
      </div>
    </section>
  );
}

