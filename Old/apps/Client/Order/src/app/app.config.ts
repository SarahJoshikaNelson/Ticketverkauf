import { APP_INITIALIZER, ApplicationConfig, Provider } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { KeycloakBearerInterceptor, KeycloakService } from 'keycloak-angular';
import { isE2EMode } from './e2e-mode';
import { E2EKeycloakService } from './e2e-keycloak.service';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';

function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: 'https://auth.htl-leonding.ac.at', // URL of the Keycloak server
        realm: 'htlleonding', // Realm to be used in Keycloak
        clientId: 'htlleonding-service', // Client ID for the application in Keycloak,
      },
      initOptions: {
        onLoad: 'check-sso', // Action to take on load
        //enableLogging: true, // Enables logging
        pkceMethod: 'S256', // Proof Key for Code Exchange (PKCE) method to use
        // IMPORTANT: implicit flow is no longer recommended, but using standard flow leads to a 401 at the keycloak server
        // when retrieving the token with the access code - we leave it like this for the moment until a solution is found
        flow: 'standard',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html', // URI for silent SSO checks
      },
      // Enables Bearer interceptor
      enableBearerInterceptor: true,
      // Prefix for the Bearer token
      bearerPrefix: 'Bearer',
      // Note: bookOrder endpoint supports both Keycloak authentication (via Bearer token)
      // and non-student token-based authentication (via request body token)
    });
}

// Provider for Keycloak Bearer Interceptor
const KeycloakBearerInterceptorProvider: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: KeycloakBearerInterceptor,
  multi: true,
};

// Provider for Keycloak Initialization
const KeycloakInitializerProvider: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initializeKeycloak,
  multi: true,
  deps: [KeycloakService],
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    ...(isE2EMode()
      ? [{ provide: KeycloakService, useClass: E2EKeycloakService } as Provider]
      : [
        KeycloakBearerInterceptorProvider,
        KeycloakInitializerProvider,
        KeycloakService,
      ]),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
  ],
};
