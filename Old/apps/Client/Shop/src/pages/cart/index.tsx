import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Plus, Minus, CreditCard, Trash2, ArrowUpCircle, BookmarkPlus, AlertTriangle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { useShopStock } from '../../hooks/useShopStock';
import type { Product } from '../../types';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

interface CartPageProps {
  onOpenLogin: () => void;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  STUDENT: 'SchülerTicket',
  EXTERNAL: 'Standard Ticket',
  GRADUATE: 'Absolventen-Ticket',
};

export default function CartPage({ onOpenLogin }: CartPageProps) {
  const { items, upgradeItems, removeFromCart, updateQuantity, updateUpgradeQuantity, removeUpgrade, totalPrice, clearCart } = useCart();
  const auth = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeChecked, setStripeChecked] = useState(false);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const liveProducts = useShopStock(initialProducts);
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}api/v2/checkout/stripe-enabled`)
      .then((r) => r.ok ? r.json() : { enabled: false })
      .then((data) => setStripeEnabled(data.enabled === true))
      .catch(() => setStripeEnabled(false))
      .finally(() => setStripeChecked(true));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    fetch(`${apiUrl}api/v2/shop/products`)
      .then((r) => r.json())
      .then((data) => setInitialProducts(Array.isArray(data) ? data : []))
      .catch(() => setInitialProducts([]));
  }, [items.length]);

  const refreshProducts = () => {
    fetch(`${apiUrl}api/v2/shop/products`)
      .then((r) => r.json())
      .then((data) => setInitialProducts(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const handleConflictResponse = (message: string) => {
    setConflictError(message);
    refreshProducts();
  };

  const handleRemoveUnavailable = () => {
    const isUpgradeIssue = conflictError?.includes('Ticket') || conflictError?.includes('digitale');
    const isProductIssue = conflictError?.includes('Lagerbestand') || conflictError?.includes('Produkt');

    if (isProductIssue || (!isUpgradeIssue && !isProductIssue)) {
      for (const item of items) {
        const liveStock = liveProducts.find(p => p.id === item.id)?.stock ?? 0;
        if (liveStock <= 0) {
          removeFromCart(item.id);
        } else if (item.quantity > liveStock) {
          updateQuantity(item.id, liveStock - item.quantity);
        }
      }
    }

    if (isUpgradeIssue || (!isUpgradeIssue && !isProductIssue)) {
      for (const u of [...upgradeItems]) {
        removeUpgrade(u.ticketType);
      }
    }

    setConflictError(null);
  };

  const handleReserve = async () => {
    setLoading(true);
    setConflictError(null);
    const authHeaders = {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    };

    try {
      if (items.length > 0) {
        const response = await fetch(`${apiUrl}api/v2/shop/bulk-order`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ items: items.map(i => ({ productId: i.id, quantity: i.quantity })) })
        });
        if (!response.ok) {
          let message = 'Fehler bei der Produktbestellung.';
          try {
            const d = await response.json();
            if (d?.message) message = d.message;
          } catch { /* ignore */ }
          if (response.status === 409) {
            handleConflictResponse(message);
          } else {
            showNotification('error', 'Reservierung fehlgeschlagen', message);
          }
          setLoading(false);
          return;
        }
      }

      for (const upgrade of upgradeItems) {
        const response = await fetch(`${apiUrl}api/v2/shop/upgrade-by-type`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ ticketType: upgrade.ticketType, quantity: upgrade.quantity }),
        });
        if (!response.ok) {
          let message = `Fehler beim Upgrade (${upgrade.ticketType}).`;
          try {
            const d = await response.json();
            if (d?.message) message = d.message;
          } catch { /* ignore */ }
          if (response.status === 409) {
            handleConflictResponse(message);
          } else {
            showNotification('error', 'Upgrade fehlgeschlagen', message);
          }
          setLoading(false);
          return;
        }
      }

      clearCart();
      navigate('/account');
      showNotification('success', 'Reservierung aufgegeben!', 'Ihre Artikel wurden erfolgreich reserviert.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Verbindungsfehler', 'Es konnte keine Verbindung zum Server hergestellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    setConflictError(null);
    const authHeaders = {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    };

    try {
      const body = {
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
        upgrades: upgradeItems.map(u => ({ ticketType: u.ticketType, quantity: u.quantity })),
      };

      const response = await fetch(`${apiUrl}api/v2/shop/create-checkout-session`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = 'Fehler beim Erstellen der Checkout-Session.';
        try {
          const d = await response.json();
          if (d?.message) message = d.message;
        } catch { /* ignore */ }
        if (response.status === 409) {
          handleConflictResponse(message);
        } else {
          showNotification('error', 'Checkout fehlgeschlagen', message);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      clearCart();
      window.location.href = data.location;
    } catch (err) {
      console.error(err);
      showNotification('error', 'Verbindungsfehler', 'Es konnte keine Verbindung zum Server hergestellt werden.');
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!auth.isAuthenticated) {
      onOpenLogin();
      return;
    }

    if (stripeEnabled) {
      await handleStripeCheckout();
    } else {
      await handleReserve();
    }
  };

  if (items.length === 0 && upgradeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="bg-muted p-10 rounded-full text-muted-foreground">
          <ShoppingBag size={64} />
        </div>
        <h2 className="text-3xl font-bold text-center text-foreground">Dein Warenkorb ist leer</h2>
        <Link
          to="/"
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
        >
          Zurück zum Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-4xl font-black text-foreground">Warenkorb</h1>

      {conflictError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-red-500/20 p-3 rounded-xl text-red-500 shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-red-500">Artikel nicht mehr verfügbar</h3>
            <p className="text-sm text-muted-foreground">
              Jemand anderes war leider schneller — einige Artikel in deinem Warenkorb sind
              inzwischen nicht mehr in der gewünschten Menge verfügbar.
              Entferne sie, um fortfahren zu können.
            </p>
          </div>
          <button
            onClick={handleRemoveUnavailable}
            className="shrink-0 bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
          >
            Entfernen
          </button>
        </div>
      )}

      <div className="shop-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-border">
          {items.map(item => {
            const liveStock = liveProducts.find((p) => p.id === item.id)?.stock ?? item.stock;
            const atMax = item.quantity >= liveStock;
            return (
            <div key={item.id} className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group text-foreground">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="h-full w-full object-cover" alt="" />
                ) : (
                  <ShoppingCart className="h-full w-full p-6 text-muted-foreground opacity-30" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground font-mono">{item.price.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className="flex items-center gap-4 bg-muted/80 p-2 rounded-xl">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-2 hover:bg-card rounded-lg transition-colors text-foreground"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold w-8 text-center text-foreground">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  disabled={atMax}
                  className="p-2 hover:bg-card rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
                  title={atMax ? `Maximaler Lagerbestand (${liveStock}) erreicht` : undefined}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="text-right font-black text-xl min-w-[100px] text-foreground">
                {(item.price * item.quantity).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ); })}

          {upgradeItems.map(u => (
            <div key={u.ticketType} className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 group bg-primary/5 border-t border-border text-foreground">
              <div className="h-24 w-24 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <ArrowUpCircle size={40} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-black text-primary uppercase tracking-widest mb-1">Ticket-Upgrade</div>
                <h3 className="text-xl font-bold text-foreground">{TICKET_TYPE_LABELS[u.ticketType] ?? u.ticketType}</h3>
              </div>
              <div className="flex items-center gap-4 bg-muted/80 p-2 rounded-xl">
                <button
                  onClick={() => updateUpgradeQuantity(u.ticketType, -1)}
                  className="p-2 hover:bg-card rounded-lg transition-colors text-foreground"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold w-8 text-center text-foreground">{u.quantity}</span>
                <button
                  onClick={() => updateUpgradeQuantity(u.ticketType, 1)}
                  className="p-2 hover:bg-card rounded-lg transition-colors text-foreground"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="text-right font-black text-xl min-w-[100px] text-foreground">
                {(u.quantity * u.pricePerUnit).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}
              </div>
              <button
                onClick={() => removeUpgrade(u.ticketType)}
                className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
        <div className="bg-muted/60 border-t-2 border-border p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Gesamtsumme</p>
            <p className="text-4xl font-black text-primary">{totalPrice.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || !stripeChecked || !!conflictError}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading
              ? 'Wird bearbeitet...'
              : !stripeChecked
                ? 'Laden...'
                : stripeEnabled
                  ? <><CreditCard size={24} /> Jetzt bezahlen</>
                  : <><BookmarkPlus size={24} /> Jetzt reservieren</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
