import React, { useState, useEffect, useMemo } from 'react';
import { User, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { CompletedOrderItem } from '../../types';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

interface StackedOrderItem {
  type: 'product' | 'upgrade';
  title: string;
  quantity: number;
  orderedAt: string;
  totalPrice: number;
}

function stackOrders(orders: CompletedOrderItem[]): StackedOrderItem[] {
  const result: StackedOrderItem[] = [];
  const upgradeMap = new Map<string, StackedOrderItem>();

  for (const o of orders) {
    if (o.type === 'upgrade') {
      const existing = upgradeMap.get(o.title);
      if (existing) {
        existing.quantity += o.quantity;
        existing.totalPrice += o.totalPrice;
        if (o.orderedAt > existing.orderedAt) existing.orderedAt = o.orderedAt;
      } else {
        const stacked: StackedOrderItem = { type: 'upgrade', title: o.title, quantity: o.quantity, orderedAt: o.orderedAt, totalPrice: o.totalPrice };
        upgradeMap.set(o.title, stacked);
      }
    } else {
      result.push({ type: o.type, title: o.title, quantity: o.quantity, orderedAt: o.orderedAt, totalPrice: o.totalPrice });
    }
  }

  result.push(...upgradeMap.values());
  result.sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  return result;
}

export default function AccountPage() {
  const [orders, setOrders] = useState<CompletedOrderItem[]>([]);
  const auth = useAuth();

  const stackedOrders = useMemo(() => stackOrders(orders), [orders]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) return;
    const headers = { Authorization: `Bearer ${auth.token}` };
    fetch(`${apiUrl}api/v2/shop/my-completed-orders`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]));
  }, [auth.isAuthenticated, auth.token]);

  if (!auth.isAuthenticated) {
    return (
      <div className="text-center p-20 font-bold text-xl text-muted-foreground">
        Bitte anmelden um Ihr Konto zu sehen.
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black mb-2 text-foreground">Mein Konto</h1>
        <p className="text-muted-foreground font-semibold flex items-center gap-2">
          <User size={18} /> {auth.userEmail}
        </p>
      </header>

      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-3 rounded-xl text-primary shadow-inner">
            <ShoppingCart size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Bestellverlauf</h2>
            <p className="text-muted-foreground">Deine bisherigen Einkäufe (Produkte und Ticket-Upgrades)</p>
          </div>
        </div>

        {stackedOrders.length === 0 ? (
          <div className="bg-muted/20 border-2 border-dashed border-border rounded-2xl p-20 text-center">
            <p className="text-muted-foreground font-semibold text-lg">Keine Bestellungen gefunden.</p>
          </div>
        ) : (
          <div className="shop-table rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-8 py-5">Artikel</th>
                  <th className="px-8 py-5 text-center">Menge</th>
                  <th className="px-8 py-5">Datum</th>
                  <th className="px-8 py-5 text-right">Summe</th>
                </tr>
              </thead>
              <tbody>
                {stackedOrders.map((order, idx) => (
                  <tr key={`${order.type}-${order.title}-${idx}`}>
                    <td className="px-8 py-6 font-bold text-lg text-foreground">{order.title}</td>
                    <td className="px-8 py-6 text-center font-semibold cell-muted">{order.quantity}</td>
                    <td className="px-8 py-6 cell-muted">
                      {new Date(order.orderedAt).toLocaleDateString('de-AT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-8 py-6 text-right font-mono font-black text-primary">
                      {order.totalPrice.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
