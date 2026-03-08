// src/context/CartContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ shopId: null, shopName: "", shopEmoji: "", items: [] });

  const addItem = useCallback((shopId, shopName, shopEmoji, item) => {
    setCart(prev => {
      // Different shop → replace cart
      if (prev.shopId && prev.shopId !== shopId) {
        return { shopId, shopName, shopEmoji, items: [{ ...item, qty: 1 }] };
      }
      const exists = prev.items.find(i => i.id === item.id);
      return {
        shopId, shopName, shopEmoji,
        items: exists
          ? prev.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
          : [...prev.items, { ...item, qty: 1 }],
      };
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCart(prev => {
      const items = prev.items
        .map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i)
        .filter(i => i.qty > 0);
      return items.length === 0
        ? { shopId: null, shopName: "", shopEmoji: "", items: [] }
        : { ...prev, items };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({ shopId: null, shopName: "", shopEmoji: "", items: [] });
  }, []);

  const total     = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cart.items.reduce((s, i) => s + i.qty, 0);
  const getQty    = (itemId) => cart.items.find(i => i.id === itemId)?.qty || 0;

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, clearCart, total, itemCount, getQty }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);