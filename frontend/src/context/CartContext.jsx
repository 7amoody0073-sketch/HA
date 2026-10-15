import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("halwaji_cart")) || [];
      return raw.map((i) =>
        i.key
          ? i
          : { key: i.product.id, product: i.product, optionName: "", price: i.product.price, unit: i.product.unit, quantity: i.quantity }
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("halwaji_cart", JSON.stringify(items));
  }, [items]);

  const add = (product, option = null) => {
    const key = option ? `${product.id}|${option.name}` : product.id;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      return [
        ...prev,
        {
          key,
          product,
          optionName: option ? option.name : "",
          price: option ? option.price : product.price,
          unit: option ? option.name : product.unit,
          quantity: 1,
        },
      ];
    });
  };

  const setQty = (key, qty) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i))
    );
  };

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, setQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
