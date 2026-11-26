import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, CartItem, UpgradeCartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  upgradeItems: UpgradeCartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  addUpgrade: (item: Omit<UpgradeCartItem, 'type'>) => void;
  updateUpgradeQuantity: (ticketType: string, delta: number) => void;
  removeUpgrade: (ticketType: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const cached = localStorage.getItem('shop-cart');
    return cached ? JSON.parse(cached) : [];
  });

  const [upgradeItems, setUpgradeItems] = useState<UpgradeCartItem[]>(() => {
    const cached = localStorage.getItem('shop-cart-upgrades');
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    localStorage.setItem('shop-cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('shop-cart-upgrades', JSON.stringify(upgradeItems));
  }, [upgradeItems]);

  const addToCart = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setItems(prev => prev.filter(i => i.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === productId) {
        const newQty = Math.max(1, Math.min(i.stock, i.quantity + delta));
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const addUpgrade = (item: Omit<UpgradeCartItem, 'type'>) => {
    setUpgradeItems(prev => {
      const existing = prev.find(u => u.ticketType === item.ticketType);
      if (existing) {
        return prev.map(u =>
          u.ticketType === item.ticketType
            ? { ...u, quantity: u.quantity + item.quantity, pricePerUnit: item.pricePerUnit }
            : u
        );
      }
      return [...prev, { type: 'upgrade', ...item }];
    });
  };

  const updateUpgradeQuantity = (ticketType: string, delta: number) => {
    setUpgradeItems(prev =>
      prev
        .map(u =>
          u.ticketType === ticketType
            ? { ...u, quantity: Math.max(0, u.quantity + delta) }
            : u
        )
        .filter(u => u.quantity > 0)
    );
  };

  const removeUpgrade = (ticketType: string) => {
    setUpgradeItems(prev => prev.filter(u => u.ticketType !== ticketType));
  };

  const clearCart = () => {
    setItems([]);
    setUpgradeItems([]);
  };

  const totalItems =
    items.reduce((sum, i) => sum + i.quantity, 0) +
    upgradeItems.reduce((sum, u) => sum + u.quantity, 0);
  const totalPrice =
    items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
    upgradeItems.reduce((sum, u) => sum + u.quantity * u.pricePerUnit, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        upgradeItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        addUpgrade,
        updateUpgradeQuantity,
        removeUpgrade,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
