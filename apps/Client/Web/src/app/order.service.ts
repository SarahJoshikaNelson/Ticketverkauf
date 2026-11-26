import { Injectable } from '@angular/core';
import { Order, Customer } from '@ticket-system/models/order';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';
import { LoginToken } from '@ticket-system/models/order';
import { KeycloakService } from 'keycloak-angular';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(private httpClient: HttpClient, private keycloakService: KeycloakService) {}

  async login(customer: Customer) {
    let token;
    token = firstValueFrom(
      this.httpClient.post<LoginToken>(
        `${environment.API_URL}/api/v2/user/login`,
        {
          email: customer.mailAddress,
          password: customer.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        }
      )
    );
    return token;
  }

  async fetchOrders(
    email: string | null,
    token: string | null
  ): Promise<Order[] | null> {
    try {
      // For student authentication, use the Bearer token (handled by interceptor)
      if (this.keycloakService.isLoggedIn()) {
        const profile = await this.keycloakService.getKeycloakInstance().loadUserProfile();
        return await firstValueFrom(
          this.httpClient.get<Order[]>(
            `${environment.API_URL}/api/v2/order/all/${profile.email}/${token || 'null'}`
          )
        );
      }
      
      // For non-student authentication, send without Bearer token
      return await firstValueFrom(
        this.httpClient.get<Order[]>(
          `${environment.API_URL}/api/v2/order/all/${email}/${token}`,
          {
            headers: {
              // Don't include Authorization header - handled by request body token
            }
          }
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return null;
      }
      throw error; // Re-throw other errors
    }
  }

  async downloadOrder(orderId: string) {
    let url: string;
    const headers: Record<string, string> = {
      'Accept': 'application/pdf',
    };

    if (this.keycloakService.isLoggedIn()) {
      url = `${environment.API_URL}/api/v2/order/download/${orderId}`;
      headers['Authorization'] = `Bearer ${this.keycloakService.getKeycloakInstance().token}`;
    } else {
      const token = localStorage.getItem('non-student-auth-token');
      url = `${environment.API_URL}/api/v2/order/download/${orderId}${token ? `?token=${token}` : ''}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download failed:', response.status, errorText);
      throw new Error(errorText || 'Download failed');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
  }

  async downloadTicket(orderId: string, ticketNumber: number) {
    let url: string;
    const headers: Record<string, string> = {
      'Accept': 'application/pdf',
    };

    if (this.keycloakService.isLoggedIn()) {
      url = `${environment.API_URL}/api/v2/order/${orderId}/ticket/${ticketNumber}`;
      headers['Authorization'] = `Bearer ${this.keycloakService.getKeycloakInstance().token}`;
    } else {
      const token = localStorage.getItem('non-student-auth-token');
      url = `${environment.API_URL}/api/v2/order/${orderId}/ticket/${ticketNumber}${token ? `?token=${token}` : ''}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ticket download failed:', response.status, errorText);
      throw new Error(errorText || 'Ticket download failed');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger download with custom filename
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `Ticket-${ticketNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL after a short delay
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 100);
  }

  async downloadBill(orderId: string) {
    let url: string;
    const headers: Record<string, string> = {
      'Accept': 'application/pdf',
    };

    if (this.keycloakService.isLoggedIn()) {
      url = `${environment.API_URL}/api/v2/order/bill/${orderId}`;
      headers['Authorization'] = `Bearer ${this.keycloakService.getKeycloakInstance().token}`;
    } else {
      const token = localStorage.getItem('non-student-auth-token');
      url = `${environment.API_URL}/api/v2/order/bill/${orderId}${token ? `?token=${token}` : ''}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bill download failed:', response.status, errorText);
      throw new Error(errorText || 'Bill download failed');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
  }

  async sendVerificationCode(email: string): Promise<boolean> {
    try {
      const result = await fetch(
        `${environment.API_URL}/api/v2/user/send-verification-code?email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      );
      const data = await result.json();
      return data.sent === true;
    } catch {
      return false;
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    try {
      const result = await fetch(
        `${environment.API_URL}/api/v2/user/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}&newPassword=${encodeURIComponent(newPassword)}`,
        { method: 'POST' }
      );
      const data = await result.json();
      return data.success === true;
    } catch {
      return false;
    }
  }
}
