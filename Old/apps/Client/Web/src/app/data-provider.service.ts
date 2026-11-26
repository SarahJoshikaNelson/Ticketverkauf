import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';

interface Data {
  title: string;
  subTitle: string;
  onDate: string;
  images: string[];
  schedule: Routine[];
}

export type Routine = {
  title: string,
  start: string
}

@Injectable({
  providedIn: 'root'
})
export class DataProviderService {
  constructor(private http: HttpClient) { 
    this.loadDataFromLocalStorage();
  }

  private loadDataFromLocalStorage(): void {
    const data = localStorage.getItem('appData');
    if (data) {
      try {
        this.data = JSON.parse(data) as Data;
      } catch (error) {
        console.error('Error parsing data from localStorage:', error);
        this.data = { title: '', subTitle: '', onDate: '', images: [], schedule: [] };
      }
      console.log('Data loaded from localStorage:', this.data);
    } else {
      this.data = { title: '', subTitle: '', onDate: '', images: [], schedule: [] };
    }
  }

  private saveDataToLocalStorage(): void {
    if (!this.data) return;
    
    try {
      // Store data without images to avoid localStorage quota issues
      // Base64 images are too large for localStorage
      const dataToStore = {
        ...this.data,
        images: [] // Don't store images in localStorage
      };
      localStorage.setItem('appData', JSON.stringify(dataToStore));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data and retrying...');
        localStorage.removeItem('appData');
        try {
          const dataToStore = { ...this.data, images: [] };
          localStorage.setItem('appData', JSON.stringify(dataToStore));
        } catch (retryError) {
          console.error('Failed to save data to localStorage even after clearing:', retryError);
        }
      } else {
        console.error('Error saving data to localStorage:', error);
      }
    }
  }

  private data: Data | null = null;

  // Title functions
  async getTitle() {
      this.data = await firstValueFrom(this.http.get<Data>(environment.API_URL + '/api/v2/data'));
      console.log('Data loaded from API:', this.data);
    this.saveDataToLocalStorage();
    return this.data.title;
  }
  getTitleLocal(): string | null {
    if (!this.data) {
      this.loadDataFromLocalStorage();
    }
    return this.data ? this.data.title : null;
  }
  saveTitleLocal(title: string) {
    if (!this.data) {
      this.data = { title, subTitle: '', onDate: '', images: [], schedule: [] };
    } else {
      this.data.title = title;
    }
  }

  // Subtitle functions
  async getSubtitle() {
    this.data = await firstValueFrom(this.http.get<Data>(environment.API_URL + '/api/v2/data'));
    this.saveDataToLocalStorage();
    return this.data.subTitle;
  }
  getSubtitleLocal(): string | null {
    if (!this.data) {
      this.loadDataFromLocalStorage();
    }
    return this.data ? this.data.subTitle : null;
  }
  saveSubtitleLocal(subTitle: string) {
    if (!this.data) {
      this.data = { title: '', subTitle, onDate: '', images: [], schedule: [] };
    } else {
      this.data.subTitle = subTitle;
    }
    this.saveDataToLocalStorage();
  }

  // Images functions
  async getImages() {
    this.data = await firstValueFrom(this.http.get<Data>(environment.API_URL + '/api/v2/data'));
    this.saveDataToLocalStorage();
    // Decode base64 encoded images
    if (this.data.images) {
      return this.data.images.map(base64Image => {
        return 'data:image/jpeg;base64,' + base64Image;
      });
    }
    return this.data.images || [];
  }
  getImagesLocal(): string[] {
    if (!this.data) {
      this.loadDataFromLocalStorage();
    }
    if (!this.data || !this.data.images) return [];
    return this.data.images.map(base64Image => 'data:image/jpeg;base64,' + base64Image);
  }
  saveImagesLocal(images: string[]) {
    if (!this.data) {
      this.data = { title: '', subTitle: '', onDate: '', images, schedule: [] };
    } else {
      this.data.images = images;
    }
    this.saveDataToLocalStorage();
  }

  // Schedule functions
  async getSchedule() {
    this.data = await firstValueFrom(this.http.get<Data>(environment.API_URL + '/api/v2/data'));
    this.saveDataToLocalStorage();
    return this.data.schedule;
  }
  getScheduleLocal(): Routine[] {
    if (!this.data) {
      this.loadDataFromLocalStorage();
    }
    return this.data ? this.data.schedule : [];
  }
  saveScheduleLocal(schedule: Routine[]) {
    if (!this.data) {
      this.data = { title: '', subTitle: '', onDate: '', images: [], schedule };
    } else {
      this.data.schedule = schedule;
    }
    this.saveDataToLocalStorage();
  }

  // Date functions
  async getDate() {
    this.data = await firstValueFrom(this.http.get<Data>(environment.API_URL + '/api/v2/data'));
    this.saveDataToLocalStorage();
    try {
      const dateString = this.data.onDate.replace(/\[.*\]$/, '');
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.error('Invalid date format received from API:', this.data.onDate);
      }
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  }
  getDateLocal(): Date | null {
    if (!this.data || !this.data.onDate) return null;
    try {
      const dateString = this.data.onDate.replace(/\[.*\]$/, '');
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date format from onDate:', this.data.onDate);
        return null;
      }
      return date;
    } catch (error) {
      console.error('Error parsing local date:', error);
      return null;
    }
  }
  saveDateLocal(onDate: string) {
    if (!this.data) {
      this.data = { title: '', subTitle: '', onDate, images: [], schedule: [] };
    } else {
      this.data.onDate = onDate;
    }
    this.saveDataToLocalStorage();
  }
}