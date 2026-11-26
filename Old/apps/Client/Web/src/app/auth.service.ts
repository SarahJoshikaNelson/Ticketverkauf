import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private keycloakService: KeycloakService, private httpClient: HttpClient) { }

  async isLoggedIn() {
    const response = await firstValueFrom(this.httpClient.get(environment.API_URL + '/api/v2/auth/test', { observe: 'response' }));
    return response.status === 200;
  }

  logout() {
    this.keycloakService.logout();
    localStorage.clear();
  }
}
