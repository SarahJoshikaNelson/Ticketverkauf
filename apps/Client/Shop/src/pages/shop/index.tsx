import React from 'react';
import { ProductList } from '../../components/shop/ProductList';
import { TicketUpgradeSection } from '../../components/shop/TicketUpgradeSection';

export default function ShopPage() {
  return (
    <div className="space-y-16">
      <header className="max-w-3xl animate-in fade-in slide-in-from-left-4 duration-700">
        <div className="h-2 w-24 bg-primary mb-8 rounded-full" />
        <h1 className="text-5xl font-black tracking-tighter lg:text-7xl mb-6 text-foreground">
          Unser <span className="text-primary italic">Ball-Shop</span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Entdecken Sie exklusive Artikel rund um unseren Maturaball. Von edlen Erinnerungsstücken bis hin zu praktischen Ticket-Upgrades.
        </p>
      </header>

      <TicketUpgradeSection />

      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Produkte</h2>
        <ProductList />
      </section>
    </div>
  );
}
