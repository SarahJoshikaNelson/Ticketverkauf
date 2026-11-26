import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PhaseService {

  constructor(private httpClient: HttpClient) { }

  async isAllowed(): Promise<boolean> {
    try {
      const url = environment.API_URL + "/api/v2/reservation/allowed";
      const response = await firstValueFrom<boolean>(this.httpClient.get<boolean>(url));
      return response;
    } catch (error) {
      return false;
    }
  }
}
