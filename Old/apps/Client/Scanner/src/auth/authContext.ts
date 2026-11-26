import { createContext } from "react";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  status: AuthStatus;
  refresh: () => Promise<boolean>;
  markUnauthenticated: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

