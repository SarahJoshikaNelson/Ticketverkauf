import { useState, useEffect } from 'react';
import type { Product } from '../types';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

function getStockWsUrl(): string {
  const base = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  return base + '/api/v2/shop/stock';
}

/** Subscribe to live product list (stock) via WebSocket to avoid overbooking. */
export function useShopStock(initialProducts: Product[]) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    const wsUrl = getStockWsUrl();
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Product[];
        if (Array.isArray(data)) setProducts(data);
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      // keep last known state
    };

    return () => {
      ws.close();
    };
  }, []);

  return products;
}
