import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface StyleResponse {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  borderRadius: number;
  accent: string;
}

@Injectable({
  providedIn: 'root'
})
export class StyleService {

  constructor(private httpClient: HttpClient) {}

  async getStyles(): Promise<StyleResponse> {
    return await firstValueFrom<StyleResponse>(
      this.httpClient.get<StyleResponse>(`${environment.API_URL}/v2/styling/`)
    );
  }

  applyStyles(styles: StyleResponse) {
    const root = document.documentElement;
    
    // Apply styles as CSS variables
    root.style.setProperty('--primary-color', styles.primary);
    root.style.setProperty('--secondary-color', styles.secondary);
    root.style.setProperty('--text-color', styles.text);
    root.style.setProperty('--background-color', styles.background);
    root.style.setProperty('--border-radius', `${styles.borderRadius}px`);
    root.style.setProperty('--accent-color', styles.accent);
    
    // Also set Tailwind CSS variables for compatibility
    document.body.style.setProperty('--tw-text-opacity', '1');
    document.body.style.setProperty('--tw-bg-opacity', '1');
    
    console.log('Applied styles:', styles);
  }

  async getGifUrl(): Promise<string> {
    const response = await firstValueFrom<{ url: string }>(
      this.httpClient.get<{ url: string }>(`${environment.API_URL}/v2/data/gif`)
    );
    return response.url;
  }
} 