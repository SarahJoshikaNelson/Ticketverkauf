import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

interface SessionDetails {
  email: string;
  items: { productId: number; quantity: number }[];
  upgrades: { ticketType: string; quantity: number }[];
  paymentStatus: string;
  amountTotal: number;
  currency: string;
}

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDetails | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Keine Session-ID gefunden.');
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}api/v2/shop/checkout/session/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Bestelldetails konnten nicht geladen werden.');
        return r.json();
      })
      .then((data) => setSession(data))
      .catch(() =>
        setError('Bestelldetails konnten nicht geladen werden. Bitte überprüfen Sie Ihre E-Mail für die Bestätigung.')
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <Loader2 size={48} className="animate-spin text-primary" />
        <p className="text-muted-foreground font-semibold">Bestellung wird geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="bg-red-500/10 p-6 rounded-full">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <p className="text-muted-foreground font-semibold text-center max-w-md">{error}</p>
        <Link
          to="/"
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
        >
          Zurück zum Shop
        </Link>
      </div>
    );
  }

  const totalEur = session?.amountTotal ? session.amountTotal / 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex bg-green-500/10 p-6 rounded-full">
          <CheckCircle size={64} className="text-green-500" />
        </div>
        <h1 className="text-4xl font-black text-foreground">Zahlung erfolgreich!</h1>
        <p className="text-muted-foreground text-lg">
          Vielen Dank für Ihren Einkauf. Ihre Bestellung wurde erfolgreich abgeschlossen.
        </p>
      </div>

      {session && (
        <div className="shop-card rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-xl font-bold text-foreground">Bestellübersicht</h2>

          <div className="border-t border-border pt-6 space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Status</span>
              <span className="font-bold text-green-500">Bezahlt</span>
            </div>
            <div className="flex justify-between font-black text-xl text-primary">
              <span>Gesamt</span>
              <span>{totalEur.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/account"
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all text-center"
        >
          Meine Bestellungen
        </Link>
        <Link
          to="/"
          className="bg-muted text-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all text-center"
        >
          Zurück zum Shop
        </Link>
      </div>
    </div>
  );
}
