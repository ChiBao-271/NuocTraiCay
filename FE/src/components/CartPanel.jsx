import { formatCurrency } from '../services/productService.js';

export function CartPanel({ items, total, onChangeQuantity }) {
  return (
    <section id="cart" className="panel cart-panel">
      <div className="panel-heading">
        <span className="eyebrow">My Cart</span>
        <h2>Giỏ hàng kiểu website shop</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span>🛒</span>
          <p>Chưa có sản phẩm trong giỏ. Hãy chọn nước ép hoặc trái cây yêu thích.</p>
        </div>
      ) : (
        <div className="cart-list">
          {items.map((item) => (
            <div className="cart-item" key={item.id}>
              <span className="cart-item-icon">{item.image}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{formatCurrency(item.price)} / {item.unit}</small>
              </div>
              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                  aria-label={`Giảm ${item.name}`}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                  aria-label={`Tăng ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cart-total">
        <span>Tổng cộng</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
      <div className="coupon-line"><span>🎟 FREESHIP30</span><button type="button">Áp dụng</button></div>
      <button className="btn btn-primary full-width checkout-glow" type="button">Tiến hành thanh toán</button>
    </section>
  );
}

