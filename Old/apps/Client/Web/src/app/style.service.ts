import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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

  getStylesLocal(): StyleResponse {
    return {
      primary: localStorage.getItem('primary') || '#000000',
      secondary: localStorage.getItem('secondary') || '#000000',
      text: localStorage.getItem('text') || '#000000',
      background: localStorage.getItem('background') || '#000000',
      borderRadius: parseInt(localStorage.getItem('borderRadius') || '0'),
      accent: localStorage.getItem('accent') || '#000000'
    };
  }

  async getStyles(): Promise<StyleResponse> {
    return await firstValueFrom<StyleResponse>(
      this.httpClient.get<StyleResponse>(`${environment.API_URL}/api/v2/styling/`)
    );
  }

  saveStylesLocal(styles: StyleResponse) {
    localStorage.setItem('primary', styles.primary);
    localStorage.setItem('secondary', styles.secondary);
    localStorage.setItem('text', styles.text);
    localStorage.setItem('background', styles.background);
    localStorage.setItem('borderRadius', styles.borderRadius.toString());
    localStorage.setItem('accent', styles.accent);
  }

  applyStyles(styles: StyleResponse) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', styles.primary);
    root.style.setProperty('--secondary-color', styles.secondary);
    root.style.setProperty('--text-color', styles.text);
    root.style.setProperty('--background-color', styles.background);
    root.style.setProperty('--border-radius', `${styles.borderRadius}px`);
    root.style.setProperty('--accent-color', styles.accent);
  }
} 