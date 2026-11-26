import Keycloak from "keycloak-js";

export const keycloakConfig = {
  url: "https://auth.htl-leonding.ac.at",
  realm: "htlleonding",
  clientId: "htlleonding-service",
};

let keycloakInstance: Keycloak | null = null;

export const getKeycloakInstance = () => {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
};

export const getKeycloakLoginUrl = (redirectUri: string) => {
  const base = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth`;
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    response_type: "code",
    scope: "openid",
    redirect_uri: redirectUri,
  });
  return `${base}?${params.toString()}`;
};

export default getKeycloakInstance;

