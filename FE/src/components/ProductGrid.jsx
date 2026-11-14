'use client';

import { useCallback, useState } from 'react';
import { formatCurrency } from '../services/productService.js';
import { useCart } from '../contexts/CartContext.jsx';
import Link from 'next/link';

/** Individual product card with add-to-cart feedback animation */
function ProductCard({ product, onAddToCart, onLoginRequired }) {
  const { isCartLoaded } = useCart();
  const [addedId, setAddedId] = useState(null);
  const [flyEffect, setFlyEffect] = useState(false);

  const handleAdd = useCallback(() => {
    if (!isCartLoaded) return;
    if (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity < 1) return;
    onAddToCart(product);

    setAddedId(product.id);
    setFlyEffect(true);

    window.setTimeout(() => {
      setAddedId(null);
    }, 1400);

    window.setTimeout(() => {
      setFlyEffect(false);
    }, 700);
  }, [product, onAddToCart]);

  const isAdded = addedId === product.id;

  return (
    <article
      className={`product-card ${isAdded ? 'product-card-added' : ''}`}
      style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}
    >
      {product.id ? (
        <Link href={`/product/${product.id}`} className="product-image" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {product.imageUrl ? <img className="product-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="product-fruit fruit-a">{product.image}</span><span className="product-fruit fruit-b">{product.fruit}</span><div className="mini-bottle"><small>Original</small><strong>{product.name.split(' ')[0]}</strong></div></>}
        <small>{product.badge}</small>

        {/* Add-to-cart fly animation particle */}
        {flyEffect && (
          <span className="cart-fly-particle" aria-hidden="true">
            {product.image}
          </span>
        )}
        </Link>
      ) : (
        <div className="product-image" style={{ display: 'block' }}>
          {product.imageUrl ? <img className="product-photo" src={product.imageUrl} alt={product.name} loading="lazy" /> : <><span className="product-fruit fruit-a">{product.image}</span><span className="product-fruit fruit-b">{product.fruit}</span><div className="mini-bottle"><small>Original</small><strong>{product.name.split(' ')[0]}</strong></div></>}
          <small>{product.badge}</small>
        </div>
      )}

      <div className="product-content">
        <span className="rating">{product.rating ? `⭐ ${product.rating} · ${product.ratingCount ?? 0} đánh giá` : '🌿 Tươi mới mỗi ngày'}</span>
        {product.id ? <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><h3>{product.name}</h3></Link> : <h3>{product.name}</h3>}
        <p>{product.description}</p>
        <div className="product-meta">
          <strong>{formatCurrency(product.price)}</strong>
          <span>/{product.unit}</span>
        </div>
        <button
          className={`btn full-width product-add-btn ${isAdded ? 'product-add-btn-success' : 'btn-primary'}`}
          type="button"
          id={`add-to-cart-${product.id}`}
          onClick={handleAdd}
          aria-label={`Thêm ${product.name} vào giỏ hàng`}
          disabled={!isCartLoaded || !product.id || (product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity < 1)}
        >
          {isAdded ? (
            <span className="product-add-success-inner">
              <span className="product-add-check">✓</span> Đã thêm vào giỏ!
            </span>
          ) : !product.id ? (
            'Chưa có trong catalog'
          ) : product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity < 1 ? (
            'Hết hàng'
          ) : (
            isCartLoaded ? '+ Thêm vào giỏ' : 'Đang tải giỏ…'
          )}
        </button>
      </div>
    </article>
  );
}

export function ProductGrid({ products, loading, dataSource, error, onAddToCart, onLoginRequired }) {
  if (loading) {
    return (
      <div className="product-grid-skeleton">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="product-card skeleton-card" aria-hidden="true">
            <div className="skeleton-image" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-line-short" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line-med" />
              <div className="skeleton-line skeleton-line-short" />
              <div className="skeleton-btn" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    {dataSource === 'fallback' && <div className="catalog-fallback-notice" role="status">Đang hiển thị danh mục mẫu vì chưa kết nối được dữ liệu trực tiếp. Vui lòng tải lại hoặc thử sau.</div>}
    {error && <div className="catalog-fallback-notice" role="alert">{error}</div>}
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onLoginRequired={onLoginRequired}
        />
      ))}
    </div>
    </>
  );
}
