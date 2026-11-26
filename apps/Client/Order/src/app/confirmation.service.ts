import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export interface ConfirmationResult {
  success: boolean;
  alreadyConfirmed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  URI: string = "";

  constructor(private httpClient: HttpClient) { 
    this.URI = `${environment.API_URL}/v2/order/confirm/`;
  }

  async confirmOrder(id: string): Promise<ConfirmationResult> {
    try {
      const response = await firstValueFrom(this.httpClient.post(this.URI + id, {}, { observe: 'response' }));
      return { success: response.status === 200, alreadyConfirmed: false };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        return { success: false, alreadyConfirmed: true };
      }
      return { success: false, alreadyConfirmed: false };
    }
  }
}