import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="inline-flex bg-red-500/10 p-6 rounded-full">
        <XCircle size={64} className="text-red-500" />
      </div>
      <h1 className="text-4xl font-black text-foreground">Zahlung abgebrochen</h1>
      <p className="text-muted-foreground text-lg max-w-md mx-auto">
        Ihre Zahlung wurde abgebrochen. Es wurde nichts berechnet.
        Ihre Artikel befinden sich noch im Warenkorb.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/cart"
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
        >
          Zurück zum Warenkorb
        </Link>
        <Link
          to="/"
          className="bg-muted text-foreground px-8 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
        >
          Weiter einkaufen
        </Link>
      </div>
    </div>
  );
}
