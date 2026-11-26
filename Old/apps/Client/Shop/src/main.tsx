import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { ReactKeycloakProvider } from "@react-keycloak/web";
import createKeycloak from "./auth/keycloak";

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
      <App />
    </StrictMode>
  </ReactKeycloakProvider>
);
