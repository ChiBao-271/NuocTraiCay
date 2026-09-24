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

  // Load cart from localStorage when user changes
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch {
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

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (user && isCartLoaded) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cartItems));
    }
  }, [cartItems, user, isCartLoaded]);

  const addToCart = useCallback((product) => {
    setCartItems((current) => {
      const existing = current.find((i) => i.id === product.id);
      if (existing) {
        return current.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });

    const entry = { ...product, _addTime: Date.now() };
    setLastAdded(entry);
    lastAddedRef.current = entry;
  }, []);

  const changeQuantity = useCallback((productId, quantity) => {
    setCartItems((current) =>
      current
        .map((i) => (i.id === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((current) => current.filter((i) => i.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
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
      isCartLoaded,
      addToCart,
      changeQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartTotal, totalQuantity, lastAdded, isCartLoaded, addToCart, changeQuantity, removeFromCart, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
