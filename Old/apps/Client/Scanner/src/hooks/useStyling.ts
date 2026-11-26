import { useEffect, useState } from "react";
import { getApiBase } from "../utils/authFetch";

export type Styling = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  borderRadius: number;
};

const defaultStyling: Styling = {
  primary: "#1f2937",
  secondary: "#3b82f6",
  accent: "#f97316",
  background: "#f3f4f6",
  text: "#111827",
  borderRadius: 16,
};

const normalizeColor = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

const normalizeRadius = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

export const useStyling = () => {
  const [styling, setStyling] = useState<Styling>(defaultStyling);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStyling = async () => {
      try {
        const response = await fetch(`${getApiBase()}/v2/styling/`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load styling");
        }

        const data: Partial<Styling> = await response.json();
        if (cancelled) {
          return;
        }

        setStyling({
          primary: normalizeColor(data.primary, defaultStyling.primary),
          secondary: normalizeColor(data.secondary, defaultStyling.secondary),
          accent: normalizeColor(data.accent, defaultStyling.accent),
          background: normalizeColor(data.background, defaultStyling.background),
          text: normalizeColor(data.text, defaultStyling.text),
          borderRadius: normalizeRadius(data.borderRadius, defaultStyling.borderRadius),
        });
      } catch {
        if (!cancelled) {
          setStyling(defaultStyling);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchStyling();

    return () => {
      cancelled = true;
    };
  }, []);

  return { styling, isLoading };
};


