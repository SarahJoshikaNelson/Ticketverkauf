import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import {
  IntroPage,
  RequestCameraPage,
  ScanPage,
  ScannedPage,
  ErrorPage,
} from "./pages";
import LoginPage from "./auth/LoginPage.tsx";
import ProtectedRoute from "./auth/ProtectedRoute.tsx";
import AuthProvider from "./auth/AuthProvider.tsx";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { getKeycloakInstance } from "./auth/keycloak.ts";

const initOptions = {
  onLoad: "check-sso" as const,
  checkLoginIframe: false,
  silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
};

const keycloak = getKeycloakInstance();

createRoot(document.getElementById("root")!).render(
  <ReactKeycloakProvider authClient={keycloak} initOptions={initOptions}>
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<IntroPage />} />
              <Route path="/request-camera" element={<RequestCameraPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/scanned" element={<ScannedPage />} />
              <Route path="/error" element={<ErrorPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  </ReactKeycloakProvider>
);
