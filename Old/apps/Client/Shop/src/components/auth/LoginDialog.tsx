import React, { useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { X, User, Mail, Lock } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, email: string) => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { keycloak } = useKeycloak();
  const { showNotification } = useNotification();
  const [isNonStudent, setIsNonStudent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}api/v2/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data.token, email);
        onClose();
      } else {
        onClose();
        showNotification('error', 'Anmeldung fehlgeschlagen', 'Bitte überprüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.');
      }
    } catch (err) {
      console.error(err);
      onClose();
      showNotification('error', 'Verbindungsfehler', 'Es konnte keine Verbindung zum Server hergestellt werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-background border-2 border-primary/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Anmelden</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground">
              <X size={20} />
            </button>
          </div>

          {!isNonStudent ? (
            <div className="space-y-6">
              <p className="text-center text-muted-foreground">Sind Sie ein Schüler der HTL Leonding?</p>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => keycloak.login()}
                  className="bg-primary text-primary-foreground p-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <User size={20} /> Als Schüler anmelden
                </button>
                <button
                  onClick={() => setIsNonStudent(true)}
                  className="bg-secondary text-foreground p-4 rounded-xl font-bold border-2 border-primary/10 shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Mail size={20} /> Als Nicht-Schüler anmelden
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2 text-foreground"><Mail size={14} /> E-Mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-border bg-muted/30 text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
                  placeholder="name@beispiel.de"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2 text-foreground"><Lock size={14} /> Passwort</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-border bg-muted/30 text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground p-4 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Anmelden...' : 'Anmelden'}
              </button>
              <button
                type="button"
                onClick={() => setIsNonStudent(false)}
                className="w-full text-sm font-semibold text-muted-foreground opacity-80 hover:opacity-100 transition-opacity"
              >
                Zurück zur Auswahl
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
