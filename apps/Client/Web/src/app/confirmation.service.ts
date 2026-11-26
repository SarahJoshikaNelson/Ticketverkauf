import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {

  constructor(private httpClient: HttpClient) { }

  async confirmOrder(id: string): Promise<boolean> {
    return await firstValueFrom<boolean>(this.httpClient.post<boolean>(environment.API_URL + '/api/v1/order/' + id + '/confirm', {}));
  }
}