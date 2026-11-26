import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Room, Table, Layer } from '@ticket-system/models/order';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { isE2EMode } from './e2e-mode';

const E2E_LAYERS: Layer[] = [
  {
    name: 'Saal',
    level: 1,
    picture: '',
    rooms: [
      {
        name: 'Room A',
        layer: 'Saal',
        xposition: 0,
        yposition: 0,
        xlength: 800,
        ylength: 600,
        tables: [
          {
            name: 'A1',
            room: 'Room A',
            selectable: true,
            xposition: 120,
            yposition: 120,
            xlength: 120,
            ylength: 90,
            seats: [
              {
                id: 'seat-a1-1',
                price: 15,
                xposition: 130,
                yposition: 130,
                xlength: 16,
                ylength: 16,
                taken: false,
              },
              {
                id: 'seat-a1-2',
                price: 15,
                xposition: 160,
                yposition: 130,
                xlength: 16,
                ylength: 16,
                taken: false,
              },
            ],
          },
        ],
      },
    ],
  },
];

@Injectable({
  providedIn: 'root'
})
export class TableWebSocketService {
  private socket: WebSocket | null = null;
  private layersSubject = new BehaviorSubject<Layer[]>([]);
  private selectedSeatsSubject = new BehaviorSubject<Set<string>>(new Set());
  private connectionStatusSubject = new BehaviorSubject<'connected' | 'disconnected' | 'error'>('disconnected');

  public layers$ = this.layersSubject.asObservable();
  public rooms$ = this.layersSubject.asObservable().pipe(
    // Transform layers to rooms for backward compatibility
    map(layers => layers.flatMap(layer => layer.rooms))
  );
  public selectedSeats$ = this.selectedSeatsSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private selectedSeatIds = new Set<string>();
  private layers: Layer[] = [];
  private connectionTimeout: any;

  constructor(private httpClient: HttpClient) {}

  /**
   * Load initial layer/room/table/seat data via REST API
   */
  async loadInitialData(): Promise<Room[]> {
    if (isE2EMode()) {
      this.layers = E2E_LAYERS;
      this.layersSubject.next(this.layers);
      return this.layers.flatMap(layer => layer.rooms);
    }

    try {
      const response = await fetch(`${environment.API_URL}/v2/reservation/layers`);
      const data = await response.json();

      // Transform the response to match the expected structure
      const transformedLayers = (data || []).map((layer: any) => ({
        name: layer.name,
        level: layer.level || 0,
        picture: layer.picture || '',
        rooms: (layer.rooms || []).map((room: any) => ({
          name: room.name,
          layer: layer.name,
          tables: room.tables || [],
          xposition: room.xposition || room.XPosition || 0,
          yposition: room.yposition || room.YPosition || 0,
          xlength: room.xlength || room.XLength || 500,
          ylength: room.ylength || room.YLength || 500
        }))
      }));

      this.layers = transformedLayers;
      this.layersSubject.next(this.layers);

      // Return all rooms from all layers for backward compatibility
      return this.layers.flatMap(layer => layer.rooms);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  /**
   * Load and return all layers
   */
  async loadLayers(): Promise<Layer[]> {
    if (isE2EMode()) {
      this.layers = E2E_LAYERS;
      this.layersSubject.next(this.layers);
      return this.layers;
    }

    // If layers are already loaded, return them
    if (this.layers.length > 0) {
      return this.layers;
    }

    // Otherwise, load them
    try {
      const response = await fetch(`${environment.API_URL}/v2/reservation/layers`);
      const data = await response.json();

      // Transform the response to match the expected structure
      const transformedLayers = (data || []).map((layer: any) => ({
        name: layer.name,
        level: layer.level || 0,
        picture: layer.picture || '',
        rooms: (layer.rooms || []).map((room: any) => ({
          name: room.name,
          layer: layer.name,
          tables: room.tables || [],
          xposition: room.xposition || room.XPosition || 0,
          yposition: room.yposition || room.YPosition || 0,
          xlength: room.xlength || room.XLength || 500,
          ylength: room.ylength || room.YLength || 500
        }))
      }));

      this.layers = transformedLayers;
      this.layersSubject.next(this.layers);

      return this.layers;
    } catch (error) {
      console.error('Failed to load layers:', error);
      throw error;
    }
  }

  async connect(): Promise<Observable<Room[]>> {
    if (isE2EMode()) {
      this.connectionStatusSubject.next('connected');
      return this.rooms$;
    }

    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.close();
      }

      try {
        this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/tables/`);
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.connectionStatusSubject.next('error');
        reject(error);
        return;
      }

      // Set a timeout for connection establishment
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionStatusSubject.value !== 'connected') {
          console.error('WebSocket connection timeout');
          this.connectionStatusSubject.next('error');
          if (this.socket) {
            this.socket.close();
          }
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout

      this.socket.onopen = (event) => {
        clearTimeout(this.connectionTimeout);
        this.connectionStatusSubject.next('connected');
        resolve(this.rooms$);
      };

      this.socket.onmessage = (event) => {
        let message: any;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          console.error('Failed to parse WebSocket message as JSON:', event.data, e);
          return;
        }

        if (message.type === 'initialSelections') {
          this.updateSelectedSeats(message.selectedSeatIds || []);
        } else if (message.type === 'seatUpdate') {
          this.updateSelectedSeats(message.selectedSeatIds || []);
        } else {
          console.error('Unknown message format:', message);
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(this.connectionTimeout);
        if (this.connectionStatusSubject.value === 'connected') {
          this.connectionStatusSubject.next('disconnected');
        }
      };

      this.socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        clearTimeout(this.connectionTimeout);
        this.connectionStatusSubject.next('error');
        reject(new Error('WebSocket connection error'));
      };
    });
  }

  /**
   * Update selected seats and notify subscribers
   */
  private updateSelectedSeats(seatIds: string[]): void {
    this.selectedSeatIds = new Set(seatIds);
    this.selectedSeatsSubject.next(this.selectedSeatIds);
  }

  /**
   * Check if a seat is currently selected
   */
  isSeatSelected(seatId: string): boolean {
    return this.selectedSeatIds.has(seatId);
  }

  /**
   * Get all currently selected seat IDs
   */
  getSelectedSeatIds(): string[] {
    return Array.from(this.selectedSeatIds);
  }

  /**
   * Send seat selection to the backend
   */
  sendSeatSelection(seatIds: string[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'seatSelection',
        seatIds: seatIds
      });
      this.socket.send(message);
    } else {
      console.error('WebSocket is not open. Ready state:', this.socket?.readyState);
    }
  }

  /**
   * Send seat unselection to the backend
   */
  sendSeatUnselection(seatIds: string[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'seatUnselection',
        seatIds: seatIds
      });
      this.socket.send(message);
    } else {
      console.error('WebSocket is not open. Ready state:', this.socket?.readyState);
    }
  }

  /**
   * @deprecated Use sendSeatSelection instead
   */
  sendTableSelection(table: Table): void {
    console.warn('sendTableSelection is deprecated, use sendSeatSelection instead');
    const seatIds = table.seats.map(seat => seat.id);
    this.sendSeatSelection(seatIds);
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    return this.connectionStatusSubject.value;
  }

  close() {
    clearTimeout(this.connectionTimeout);
    if (this.socket) {
      // Send cleanup message before closing
      this.socket.close();
    }
    this.connectionStatusSubject.next('disconnected');
  }
}
