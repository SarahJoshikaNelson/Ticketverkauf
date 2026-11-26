import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { ProductImage } from './ProductImage';
import { useCart } from '../../context/CartContext';
import { useShopStock } from '../../hooks/useShopStock';
import type { Product } from '../../types';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

export const ProductList: React.FC = () => {
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const products = useShopStock(initialProducts);
  const { addToCart, items: cartItems } = useCart();

  useEffect(() => {
    fetch(`${apiUrl}api/v2/shop/products`)
      .then(res => res.json())
      .then(data => setInitialProducts(Array.isArray(data) ? data : []))
      .catch(() => setInitialProducts([]));
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
      {products.map(product => {
        const cartItem = cartItems.find(i => i.id === product.id);
        const qtyInCart = cartItem?.quantity ?? 0;
        const isAtMax = product.stock > 0 && qtyInCart >= product.stock;
        const isSoldOut = product.stock <= 0;

        return (
          <div key={product.id} className="shop-card group flex flex-col overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-primary/30">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {product.imageUrl ? (
                <ProductImage src={product.imageUrl} title={product.title} />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground opacity-30">
                  <ShoppingCart size={48} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="shop-card-title font-bold text-xl leading-tight">{product.title}</h3>
                <span className="font-bold text-lg text-primary bg-primary/10 px-2 py-1 rounded">
                  {product.price.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
              <p className="shop-card-muted text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">{product.description}</p>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full shadow-sm animate-pulse ${isSoldOut ? 'bg-red-500' : product.stock <= 10 ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {isSoldOut ? 'Ausverkauft' : product.stock <= 10 ? `Noch ${product.stock} verfügbar` : 'Auf Lager'}
                    </span>
                  </div>
                  {qtyInCart > 0 && (
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {qtyInCart}× im Korb
                    </span>
                  )}
                </div>
                <button
                  onClick={() => addToCart(product)}
                  disabled={isSoldOut || isAtMax}
                  className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale shadow-lg active:scale-95 transition-all"
                >
                  {isAtMax ? 'Maximum im Korb' : <><Plus size={20} /> In den Warenkorb</>}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
