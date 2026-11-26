import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useKeycloak } from "@react-keycloak/web";
import { useAuth } from "./useAuth";
import { clearAdminTokens, setAdminTokens } from "../utils/adminTokens";
import { getApiBase } from "../utils/authFetch";
import { useStyling } from "../hooks/useStyling";
import { getKeycloakLoginUrl } from "./keycloak";

type LocationState = {
  from?: string;
} | null;

const extractErrorMessage = async (
  response: Response
): Promise<string | null> => {
  try {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { message?: string };
      if (typeof data?.message === "string" && data.message.trim().length > 0) {
        return data.message;
      }
    }

    const text = (await response.text()).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, refresh, markUnauthenticated } = useAuth();
  const { keycloak, initialized: keycloakInitialized } = useKeycloak();
  const { styling } = useStyling();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = (location.state as LocationState)?.from ?? "/";

  useEffect(() => {
    if (status === "authenticated") {
      navigate(redirectTarget, { replace: true });
    }
  }, [status, navigate, redirectTarget]);

  const cardStyle = useMemo(
    () => ({
      borderRadius: `${styling.borderRadius}px`,
      boxShadow: `0 20px 40px rgba(0,0,0,0.5)`,
      border: `1px solid rgba(55,65,81,0.5)`,
      background: "rgba(17,24,39,0.95)",
      color: "#e5e7eb",
    }),
    [styling]
  );

  const primaryButtonStyle = useMemo(
    () => ({
      backgroundColor: "#2563eb",
      borderRadius: `${Math.max(styling.borderRadius - 4, 8)}px`,
    }),
    [styling]
  );

  const keycloakButtonStyle = useMemo(
    () => ({
      backgroundColor: "#374151",
      color: "#e5e7eb",
      borderRadius: `${Math.max(styling.borderRadius - 4, 8)}px`,
      border: "1px solid #4b5563",
    }),
    [styling]
  );

  const pageStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(135deg, #030712, #111827)`,
      color: "#e5e7eb",
    }),
    []
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const apiBase = getApiBase();
    const isHttp =
      typeof window !== "undefined" && window.location.protocol === "http:";

    try {
      const response = await fetch(`${apiBase}/v2/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        setError(message ?? "Login failed. Please verify your credentials.");
        markUnauthenticated();
        return;
      }

      if (isHttp) {
        const tokens: { accessToken: string; refreshToken: string } =
          await response.json();
        setAdminTokens(tokens.accessToken, tokens.refreshToken);
      } else {
        clearAdminTokens();
      }

      const isAuthenticated = await refresh();
      if (isAuthenticated) {
        navigate(redirectTarget, { replace: true });
      } else {
        setError("Login succeeded, but session validation failed.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      markUnauthenticated();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeycloakLogin = () => {
    const redirectUri = window.location.origin;
    if (keycloakInitialized && keycloak) {
      keycloak.login({ redirectUri });
      return;
    }

    const envUrl = import.meta.env.VITE_KEYCLOAK_LOGIN_URL as
      | string
      | undefined;
    window.location.href =
      envUrl && envUrl.length > 0 ? envUrl : getKeycloakLoginUrl(redirectUri);
  };

  if (status === "checking") {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-gray-400"
        style={pageStyle}
      >
        <div className="text-center text-lg">
          <p className="font-semibold text-blue-400">Ballkoenig Scanner</p>
          <p>Verifying permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 transition-colors"
      style={pageStyle}
    >
      <div className="w-full max-w-lg p-10 backdrop-blur-md" style={cardStyle}>
        <div className="flex flex-col items-center gap-1 mb-8 text-center">
          <span
            className="text-sm uppercase tracking-[0.3em] font-semibold"
            style={{ color: styling.accent }}
          >
            Ballkoenig
          </span>
          <h1 className="text-3xl font-bold" style={{ color: styling.primary }}>
            Scanner Admin Login
          </h1>
          <p className="text-sm opacity-80">
            Melde dich mit deinem Keycloak-Konto (HTBLA-Leonding) oder den
            Admin-Zugangsdaten an.
          </p>
        </div>
        {error && (
          <div className="mb-5 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="username"
            >
              Benutzername
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="w-full border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
              required
              style={{
                borderRadius: `${Math.max(styling.borderRadius - 6, 6)}px`,
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="password"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
              style={{
                borderRadius: `${Math.max(styling.borderRadius - 6, 6)}px`,
              }}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-70 hover:bg-blue-500 hover:brightness-110 hover:shadow-lg hover:shadow-blue-500/25 active:brightness-95"
            disabled={isSubmitting}
            style={{
              ...primaryButtonStyle,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {isSubmitting ? "Einloggen..." : "Einloggen"}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-3">
          <div className="relative flex items-center">
            <span className="flex-1 h-px bg-gray-700" />
            <span className="px-3 text-xs uppercase tracking-[0.3em] text-gray-500">
              oder
            </span>
            <span className="flex-1 h-px bg-gray-700" />
          </div>
          <button
            type="button"
            onClick={handleKeycloakLogin}
            className="w-full py-2.5 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 hover:bg-gray-500 hover:brightness-110 hover:shadow-lg active:brightness-95"
            style={{
              ...keycloakButtonStyle,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            Mit Keycloak anmelden
          </button>
        </div>
        <p className="mt-8 text-center text-xs opacity-70">
          Teil des Ballkoenig Event-Backoffice.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
