import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private keycloakService: KeycloakService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Special handling for student/allowed and graduate/allowed endpoints
    if (request.url.includes('student/allowed') || request.url.includes('graduate/allowed')) {
      // Skip auth-required endpoints if user is not authenticated
      if (!this.keycloakService.isLoggedIn()) {
        // Skip actual HTTP request and return a mock response
        console.log('Skipping auth-required endpoint:', request.url);
        // Return a special route that doesn't require authentication
        const publicRequest = request.clone({
          url: request.url.replace('/allowed', '/public-info')
        });
        return next.handle(publicRequest);
      }
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          console.error('Auth error for request:', request.url);
        }
        return throwError(() => error);
      })
    );
  }
} 