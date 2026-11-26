import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import authFetch, { getApiBase } from "../utils/authFetch";
import { clearAdminTokens } from "../utils/adminTokens";
import { AuthContext, type AuthStatus } from "./authContext";
import { useKeycloak } from "@react-keycloak/web";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const apiBase = useMemo(() => getApiBase(), []);
  const { keycloak, initialized } = useKeycloak();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!initialized) {
      return false;
    }

    setStatus("checking");
    try {
      if (keycloak?.authenticated) {
        try {
          await keycloak.updateToken(30);
        } catch {
          await keycloak.logout({ redirectUri: window.location.origin }).catch(() => undefined);
          clearAdminTokens();
          setStatus("unauthenticated");
          return false;
        }
      }

      const bearerToken =
        keycloak && keycloak.authenticated ? keycloak.token ?? undefined : undefined;

      const response = await authFetch(`${apiBase}/v2/auth/test`, bearerToken);
      if (response.ok) {
        setStatus("authenticated");
        return true;
      }
      setStatus("unauthenticated");
      return false;
    } catch {
      setStatus("unauthenticated");
      return false;
    }
  }, [apiBase, keycloak, initialized]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    void checkAuth();
  }, [initialized, keycloak?.authenticated, keycloak?.token, checkAuth]);

  const markUnauthenticated = useCallback(() => {
    clearAdminTokens();
    setStatus("unauthenticated");
    if (keycloak?.authenticated) {
      void keycloak.logout({ redirectUri: window.location.origin }).catch(() => undefined);
    }
  }, [keycloak]);

  useEffect(() => {
    if (!keycloak) {
      return;
    }

    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then(() => {
          void checkAuth();
        })
        .catch(() => {
          clearAdminTokens();
          setStatus("unauthenticated");
        });
    };

    return () => {
      keycloak.onTokenExpired = undefined;
    };
  }, [keycloak, checkAuth]);

  const value = useMemo(
    () => ({
      status,
      refresh: checkAuth,
      markUnauthenticated,
    }),
    [status, checkAuth, markUnauthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

