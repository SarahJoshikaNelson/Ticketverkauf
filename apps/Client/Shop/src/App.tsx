import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StyleProvider } from './components/global/StyleProvider';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/global/Navbar';
import { Logo } from './components/global/Logo';
import { LoginDialog } from './components/auth/LoginDialog';
import { useAuth } from './hooks/useAuth';
import ShopPage from './pages/shop';
import CartPage from './pages/cart';
import AccountPage from './pages/account';
import CheckoutSuccessPage from './pages/checkout-success';
import CheckoutCancelPage from './pages/checkout-cancel';

function AppContent() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const auth = useAuth();

  if (!auth.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary selection:text-primary-foreground">
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />
      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={auth.loginNonStudent}
      />
      <main className="container mx-auto px-4 py-16 max-w-7xl">
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage onOpenLogin={() => setIsLoginOpen(true)} />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        </Routes>
      </main>
      <footer className="border-t-2 border-border py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Logo className="h-12 w-12 mx-auto mb-6 grayscale opacity-50" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            © 2026 Ticket-System HTL Leonding
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StyleProvider>
        <NotificationProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </NotificationProvider>
      </StyleProvider>
    </BrowserRouter>
  );
}
