import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.js";

import { ReactKeycloakProvider } from "@react-keycloak/web";
import createKeycloak from "./auth/keycloak";
import { ThemeProvider } from "./components/global/ThemeProvider";

const initOptions = {
  onLoad: "check-sso",
  silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
};

createRoot(document.getElementById("root") as HTMLElement).render(
  <ReactKeycloakProvider
    authClient={createKeycloak()}
    initOptions={initOptions}
  >
    <StrictMode>
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    </StrictMode>
  </ReactKeycloakProvider>
);
