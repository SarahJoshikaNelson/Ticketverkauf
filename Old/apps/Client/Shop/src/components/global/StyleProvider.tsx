import React, { createContext, useContext, useEffect, useState } from 'react';
import { getContrastingTextColor, ensureContrast } from '../../lib/contrast';

export interface StyleResponse {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  borderRadius: number;
  accent: string;
}

interface StyleContextType {
  styles: StyleResponse | null;
  loading: boolean;
}

const StyleContext = createContext<StyleContextType>({ styles: null, loading: true });

const CACHE_KEY = 'shop-styles-cache';

export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [styles, setStyles] = useState<StyleResponse | null>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!styles);

  const applyStyles = (s: StyleResponse) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', s.primary);
    root.style.setProperty('--secondary', s.secondary);
    const safeForeground = ensureContrast(s.background, s.text);
    root.style.setProperty('--foreground', safeForeground);
    root.style.setProperty('--background', s.background);
    root.style.setProperty('--radius', `${s.borderRadius}px`);
    root.style.setProperty('--accent', s.accent);
    const primaryForeground = getContrastingTextColor(s.primary);
    root.style.setProperty('--primary-foreground', primaryForeground);
  };

  useEffect(() => {
    // Apply cached styles immediately if they exist
    if (styles) {
      applyStyles(styles);
    }

    const fetchStyles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';
        const response = await fetch(`${apiUrl}api/v2/styling/`);
        if (response.ok) {
          const data: StyleResponse = await response.json();
          
          // Only update if data changed or no styles were present
          if (JSON.stringify(data) !== JSON.stringify(styles)) {
            setStyles(data);
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            applyStyles(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch styles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStyles();
  }, []);

  return (
    <StyleContext.Provider value={{ styles, loading }}>
      {children}
    </StyleContext.Provider>
  );
};

export const useStyle = () => useContext(StyleContext);
