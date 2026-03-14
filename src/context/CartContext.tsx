'use client';
// cspell:disable
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url: string;
  description?: string;
}

interface CartContextType {
  cart: Product[];
  mounted: boolean;
  addToCart: (item: Product) => void;
  removeFromCart: (id: number) => void;
  removeOneFromCart: (id: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [cart, setCart] = useState<Product[]>([]);
  const cartLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!mounted || cartLoadedRef.current) return;

    queueMicrotask(() => {
      const savedCart = localStorage.getItem('zipit_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart) as Product[]);
      }
      cartLoadedRef.current = true;
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !cartLoadedRef.current) return;
    localStorage.setItem('zipit_cart', JSON.stringify(cart));
  }, [cart, mounted]);

  const addToCart = (item: Product) => {
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter(item => item.id !== id));
  };

  const removeOneFromCart = (id: number) => {
    setCart((prev) => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('zipit_cart');
  };

  return (
    <CartContext.Provider value={{ cart, mounted, addToCart, removeFromCart, removeOneFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
