import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useKeycloak } from "@react-keycloak/web";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { PossiblePhase } from "@/components/settings/phases/CurrentPhase";

type PhaseContextValue = {
  phase: PossiblePhase | null;
  hasOrders: boolean | null;
  isLoading: boolean;
  refreshPhase: () => Promise<void>;
  setPhaseValue: (value: PossiblePhase | null) => void;
};

const PhaseContext = createContext<PhaseContextValue | undefined>(undefined);

const parsePhase = (value: unknown): PossiblePhase | null => {
  if (typeof value === "number" && [0, 1, 2].includes(value)) {
    return value as PossiblePhase;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && [0, 1, 2].includes(parsed)) {
      return parsed as PossiblePhase;
    }
  }
  return null;
};

export function PhaseProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<PossiblePhase | null>(null);
  const [hasOrders, setHasOrders] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { keycloak } = useKeycloak();

  const fetchPhase = useCallback(async () => {
    if (!keycloak?.token) {
      return;
    }
    setIsLoading(true);
    try {
      const [phaseResponse, ordersResponse] = await Promise.all([
        authFetch(getFetchUrl("api/v2/admin/phase"), keycloak.token),
        authFetch(getFetchUrl("api/v2/admin/hasOrders"), keycloak.token)
      ]);

      if (!phaseResponse.ok) {
        throw new Error("Failed to fetch phase");
      }

      const phaseData = await phaseResponse.json();
      setPhase(parsePhase(phaseData));

      if (ordersResponse.ok) {
        const hasOrdersData = await ordersResponse.json();
        setHasOrders(hasOrdersData);
      }
    } catch (error) {
      console.error("Error fetching phase data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [keycloak?.token]);

  useEffect(() => {
    fetchPhase();
  }, [fetchPhase]);

  const value = useMemo<PhaseContextValue>(
    () => ({
      phase,
      hasOrders,
      isLoading,
      refreshPhase: fetchPhase,
      setPhaseValue: setPhase,
    }),
    [phase, hasOrders, isLoading, fetchPhase]
  );

  return (
    <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>
  );
}

export function usePhase() {
  const context = useContext(PhaseContext);
  if (!context) {
    throw new Error("usePhase must be used within a PhaseProvider");
  }
  return context;
}
