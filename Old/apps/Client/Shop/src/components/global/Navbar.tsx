import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../context/CartContext';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  const auth = useAuth();
  const { totalItems } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-secondary py-3 px-4 shadow-lg transition-all">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo className="h-10 w-10 transition-transform group-hover:scale-110" />
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block text-foreground">Ball-Shop</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-semibold text-foreground">
            <Link to="/" className="transition-colors hover:opacity-70">Produkte</Link>
            {auth.isAuthenticated && (
              <Link to="/account" className="transition-colors hover:opacity-70 text-primary">Konto</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 text-foreground hover:opacity-70 transition-all">
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>
          {auth.isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold hidden md:inline-block text-foreground">Hallo, {auth.userName}</span>
              <button
                onClick={auth.logout}
                className="bg-accent text-foreground p-2 rounded-full hover:opacity-80 transition-all shadow-sm"
                title="Abmelden"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              Anmelden
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
