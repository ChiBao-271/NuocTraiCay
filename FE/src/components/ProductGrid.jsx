import { formatCurrency } from '../services/productService.js';

export function ProductGrid({ products, loading, dataSource, error, onAddToCart }) {
  if (loading) {
    return <div className="data-banner">Đang tải sản phẩm từ Supabase...</div>;
  }

  return (
    <>
      <div className={`data-banner ${dataSource === 'supabase' ? 'success' : 'warning'}`}>
        {dataSource === 'supabase'
          ? 'Dữ liệu sản phẩm đang được đồng bộ từ Supabase.'
          : `Đang dùng dữ liệu mẫu tại frontend${error ? ` vì Supabase báo lỗi: ${error}` : '.'}`}
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id} style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}>
            <div className="product-image">
              <span className="product-fruit fruit-a">{product.image}</span>
              <span className="product-fruit fruit-b">{product.fruit}</span>
              <div className="mini-bottle"><small>Original</small><strong>{product.name.split(' ')[0]}</strong></div>
              <small>{product.badge}</small>
            </div>
            <div className="product-content">
              <span className="rating">⭐ 4.9 · Fresh today</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-meta">
                <strong>{formatCurrency(product.price)}</strong>
                <span>/{product.unit}</span>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => onAddToCart(product)}>
                + Thêm vào giỏ
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

