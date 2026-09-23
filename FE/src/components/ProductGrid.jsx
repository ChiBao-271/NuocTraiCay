'use client';

import { useCallback, useState } from 'react';
import { formatCurrency } from '../services/productService.js';
import { useAuth } from '../contexts/AuthContext.jsx';

/** Individual product card with add-to-cart feedback animation */
function ProductCard({ product, onAddToCart, onLoginRequired }) {
  const { user } = useAuth();
  const [addedId, setAddedId] = useState(null);
  const [flyEffect, setFlyEffect] = useState(false);

  const handleAdd = useCallback(() => {
    // Bắt buộc đăng nhập mới được thêm vào giỏ
    if (!user) {
      onLoginRequired();
      return;
    }

    onAddToCart(product);

    setAddedId(product.id);
    setFlyEffect(true);

    window.setTimeout(() => {
      setAddedId(null);
    }, 1400);

    window.setTimeout(() => {
      setFlyEffect(false);
    }, 700);
  }, [product, onAddToCart, onLoginRequired, user]);

  const isAdded = addedId === product.id;

  return (
    <article
      className={`product-card ${isAdded ? 'product-card-added' : ''}`}
      style={{ '--product-gradient': product.gradient, '--product-accent': product.accent }}
    >
      <div className="product-image">
        <span className="product-fruit fruit-a">{product.image}</span>
        <span className="product-fruit fruit-b">{product.fruit}</span>
        <div className="mini-bottle">
          <small>Original</small>
          <strong>{product.name.split(' ')[0]}</strong>
        </div>
        <small>{product.badge}</small>

        {/* Add-to-cart fly animation particle */}
        {flyEffect && (
          <span className="cart-fly-particle" aria-hidden="true">
            {product.image}
          </span>
        )}
      </div>

      <div className="product-content">
        <span className="rating">⭐ 4.9 · Fresh today</span>
        <h3>{product.name}</h3>
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
          aria-label={
            user
              ? `Thêm ${product.name} vào giỏ hàng`
              : 'Đăng nhập để mua hàng'
          }
        >
          {isAdded ? (
            <span className="product-add-success-inner">
              <span className="product-add-check">✓</span> Đã thêm vào giỏ!
            </span>
          ) : user ? (
            '+ Thêm vào giỏ'
          ) : (
            '🔒 Đăng nhập để mua'
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
  );
}
