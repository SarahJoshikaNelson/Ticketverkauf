import React, { useState, useEffect } from 'react';
import { Ticket, ArrowUpCircle, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../context/CartContext';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

const TICKET_TYPE_LABELS: Record<string, string> = {
  STUDENT: 'SchülerTicket',
  EXTERNAL: 'Standard Ticket',
  GRADUATE: 'Absolventen-Ticket',
};

export const TicketUpgradeSection: React.FC = () => {
  const auth = useAuth();
  const { addUpgrade, upgradeItems } = useCart();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pricePerUpgrade, setPricePerUpgrade] = useState<number>(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) return;
    const headers = { Authorization: `Bearer ${auth.token}` };
    Promise.all([
      fetch(`${apiUrl}api/v2/shop/my-upgradeable-counts`, { headers }).then((r) => (r.ok ? r.json() : {})),
      fetch(`${apiUrl}api/v2/ticket/physical/additional-charge`).then((r) =>
        r.ok ? r.json().then((d: { additionalChargeForPhysicalTicket?: number }) => d.additionalChargeForPhysicalTicket ?? 0) : 0
      ),
    ])
      .then(([c, p]) => {
        setCounts(typeof c === 'object' && c !== null ? c : {});
        setPricePerUpgrade(Number(p) || 0);
      })
      .catch(() => {});
  }, [auth.isAuthenticated, auth.token]);

  const availableTypes = Object.entries(counts).filter(([, count]) => Number(count) > 0);
  if (!auth.isAuthenticated || availableTypes.length === 0) return null;

  const getQty = (type: string) => quantities[type] ?? 0;
  const setQty = (type: string, value: number) => {
    const max = counts[type] ?? 0;
    const inCart = upgradeItems.find((u) => u.ticketType === type)?.quantity ?? 0;
    const capped = Math.max(0, Math.min(max - inCart, value));
    setQuantities((prev) => ({ ...prev, [type]: capped }));
  };
  const inCart = (type: string) => upgradeItems.find((u) => u.ticketType === type)?.quantity ?? 0;

  const handleAddToCart = (ticketType: string) => {
    const qty = getQty(ticketType);
    if (qty < 1) return;
    addUpgrade({ ticketType, quantity: qty, pricePerUnit: pricePerUpgrade });
    setQuantities((prev) => ({ ...prev, [ticketType]: 0 }));
  };

  return (
    <div className="shop-card rounded-2xl p-8 shadow-xl border-2 border-primary/20">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary/10 p-3 rounded-xl text-primary">
          <Ticket size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ticket-Upgrades</h2>
          <p className="text-muted-foreground">Wähle pro Tickettyp, wie viele du in physische Karten umwandeln möchtest.</p>
        </div>
      </div>

      <div className="space-y-4">
        {availableTypes.map(([type, count]) => {
          const max = Number(count);
          const inCartQty = inCart(type);
          const maxSelectable = max - inCartQty;
          const qty = getQty(type);
          const label = TICKET_TYPE_LABELS[type] ?? type;

          return (
            <div
              key={type}
              className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border last:border-0"
            >
              <div>
                <span className="font-bold text-foreground">{label}</span>
                <span className="text-muted-foreground ml-2">(noch {max} digital)</span>
                {inCartQty > 0 && (
                  <span className="ml-2 text-sm font-semibold text-primary">{inCartQty}× im Warenkorb</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/80 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQty(type, qty - 1)}
                    disabled={qty <= 0}
                    className="p-2 rounded-lg hover:bg-background/80 disabled:opacity-30 text-foreground"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-bold w-8 text-center text-foreground">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(type, qty + 1)}
                    disabled={qty >= maxSelectable}
                    className="p-2 rounded-lg hover:bg-background/80 disabled:opacity-30 text-foreground"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToCart(type)}
                  disabled={qty < 1}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  <ArrowUpCircle size={18} /> In den Warenkorb
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pricePerUpgrade > 0 && (
        <p className="text-sm text-muted-foreground mt-4">Aufpreis pro Upgrade: {pricePerUpgrade.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}</p>
      )}
    </div>
  );
};
