'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const lastAddedRef = useRef(null);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Load guest and account carts from localStorage when auth resolves.
  useEffect(() => {
    if (authLoading) return;
    const guestKey = 'cart_guest';
    const accountKey = user ? `cart_${user.id}` : null;
    const readCart = (key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && Number.isFinite(Number(item.price)) && Number(item.price) >= 0 && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0).map((item) => ({ ...item, quantity: Math.min(99, Number(item.quantity)), price: Number(item.price) })) : [];
      } catch { return []; }
    };
    const guestCart = readCart(guestKey);
    const accountCart = accountKey ? readCart(accountKey) : [];
    if (user && guestCart.length) {
      const merged = new Map(accountCart.map((item) => [item.id, item]));
      for (const item of guestCart) {
        const current = merged.get(item.id);
        merged.set(item.id, current ? { ...current, quantity: Math.min(99, Number(current.quantity) + Number(item.quantity)) } : { ...item, quantity: Math.min(99, Number(item.quantity)) });
      }
      const nextCart = [...merged.values()];
      setCartItems(nextCart);
      try { localStorage.setItem(accountKey, JSON.stringify(nextCart)); localStorage.removeItem(guestKey); } catch { /* storage can be unavailable */ }
      setIsCartLoaded(true);
    } else {
      setCartItems(user ? accountCart : guestCart);
    }
    setIsCartLoaded(true);
  }, [user, authLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedVoucher = sessionStorage.getItem('checkout_voucher');
    if (!storedVoucher) { setAppliedVoucher(null); return; }
    const normalized = storedVoucher.trim().toUpperCase();
    if (normalized === 'FRESH10') setAppliedVoucher({ code: normalized, type: 'percent', value: 10 });
    else if (normalized === 'FREESHIP30') setAppliedVoucher({ code: normalized, type: 'shipping', value: 30000 });
    else setAppliedVoucher(null);
  }, []);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (isCartLoaded) {
      try { localStorage.setItem(user ? `cart_${user.id}` : 'cart_guest', JSON.stringify(cartItems)); } catch { /* storage can be unavailable */ }
    }
  }, [cartItems, user, isCartLoaded]);

  const addToCart = useCallback((product, requestedQuantity = 1) => {
    const quantityToAdd = Math.max(1, Math.min(99, Math.trunc(Number(requestedQuantity) || 1)));
    const { quantity: _ignoredQuantity, ...productFields } = product;
    setCartItems((current) => {
      const existing = current.find((i) => i.id === productFields.id);
      if (existing) {
      return current.map((i) =>
          i.id === productFields.id ? { ...i, ...productFields, quantity: Math.min(99, Number(i.quantity) + quantityToAdd) } : i,
        );
      }
      return [...current, { ...productFields, quantity: quantityToAdd }];
    });

    const entry = { ...productFields, quantity: quantityToAdd, _addTime: Date.now() };
    setLastAdded(entry);
    lastAddedRef.current = entry;
  }, []);

  const replaceCartItems = useCallback((items) => {
    if (!Array.isArray(items)) return;
    setCartItems(items.filter((item) => item && typeof item.id === 'string').map((item) => ({ ...item, quantity: Math.max(1, Math.min(99, Math.trunc(Number(item.quantity) || 1))) })));
  }, []);

  const changeQuantity = useCallback((productId, quantity) => {
    const nextQuantity = Number(quantity);
    setCartItems((current) =>
      current
        .map((i) => (i.id === productId ? { ...i, quantity: Math.min(99, nextQuantity) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((current) => current.filter((i) => i.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedVoucher(null);
    try { sessionStorage.removeItem('checkout_voucher'); } catch { /* storage unavailable */ }
  }, []);

  const applyVoucher = useCallback((voucher) => {
    setAppliedVoucher(voucher);
    try { sessionStorage.setItem('checkout_voucher', voucher.code); } catch { /* storage unavailable */ }
  }, []);
  const hydrateVoucher = useCallback((code) => {
    const normalized = String(code || '').trim().toUpperCase();
    const vouchers = { FRESH10: { code: 'FRESH10', type: 'percent', value: 10 }, FREESHIP30: { code: 'FREESHIP30', type: 'shipping', value: 30000 } };
    const voucher = vouchers[normalized] || null;
    setAppliedVoucher(voucher);
    try { if (voucher) sessionStorage.setItem('checkout_voucher', voucher.code); else sessionStorage.removeItem('checkout_voucher'); } catch { /* storage unavailable */ }
    return voucher;
  }, []);
  const removeVoucher = useCallback(() => {
    setAppliedVoucher(null);
    try { sessionStorage.removeItem('checkout_voucher'); } catch { /* storage unavailable */ }
  }, []);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartTotal,
      totalQuantity,
      lastAdded,
      appliedVoucher,
      applyVoucher,
      hydrateVoucher,
      removeVoucher,
      isCartLoaded,
      addToCart,
      replaceCartItems,
      changeQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartTotal, totalQuantity, lastAdded, appliedVoucher, isCartLoaded, addToCart, replaceCartItems, changeQuantity, removeFromCart, clearCart, applyVoucher, hydrateVoucher, removeVoucher],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
