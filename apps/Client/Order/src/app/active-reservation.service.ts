import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { environment } from '../environments/environment';
import { Subject, BehaviorSubject, takeUntil } from 'rxjs';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface ActiveReservation {
  sessionId: string;
  timestamp: Date;
  [key: string]: unknown;
}

/**
 * Service that maintains the active reservation WebSocket connection.
 * 
 * IMPORTANT: The backend removes users from active reservations after 15 seconds
 * of WebSocket disconnection. This service implements:
 * - Heartbeat pings every 5 seconds to keep connection alive
 * - Aggressive reconnection (faster than 15s timeout)
 * - Periodic mayPass refresh to maintain reservation status
 */
@Injectable({
  providedIn: 'root'
})
export class ActiveReservationService implements OnDestroy {
  private socket: WebSocket | null = null;
  private readonly destroy$ = new Subject<void>();
  
  // Reconnection settings - AGGRESSIVE to beat 15s backend timeout
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 20;
  private readonly baseReconnectDelay = 500; // Start with 500ms, not 2s
  private readonly maxReconnectDelay = 5000; // Cap at 5s to stay under 15s timeout
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Heartbeat settings - keep connection alive
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatIntervalMs = 5000; // Every 5 seconds (well under 15s timeout)
  private lastPongTime = 0;
  private missedPongs = 0;
  private readonly maxMissedPongs = 2;
  
  // Refresh active reservation periodically
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly refreshIntervalMs = 30000; // Every 30 seconds
  
  // Observable streams
  private readonly messagesSubject = new Subject<ActiveReservation>();
  private readonly statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  
  // Public observables
  readonly messages$ = this.messagesSubject.asObservable();
  readonly status$ = this.statusSubject.asObservable();
  
  // Signals for template usage
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly lastMessage = signal<ActiveReservation | null>(null);
  readonly isHealthy = signal<boolean>(false);

  constructor() {
    this.status$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.connectionStatus.set(status);
      this.isHealthy.set(status === 'connected');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  /**
   * Connect to the active reservation WebSocket
   */
  async connect(onRefresh?: (message: ActiveReservation) => void): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN || 
        this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.statusSubject.next('connecting');
    
    if (onRefresh) {
      this.messages$.pipe(takeUntil(this.destroy$)).subscribe(onRefresh);
    }

    return this.createConnection();
  }

  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.closeSocket();
        
        this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/active`);

        // Shorter connection timeout - we need to be quick
        const connectionTimeout = setTimeout(() => {
          if (this.statusSubject.value !== 'connected') {
            console.error('Active reservation WebSocket connection timeout');
            this.socket?.close();
            this.statusSubject.next('error');
            // Don't reject, attempt reconnect immediately
            this.attemptReconnect();
          }
        }, 5000); // 5 second timeout

        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
          // WebSocket connected
          this.statusSubject.next('connected');
          this.reconnectAttempts = 0;
          this.missedPongs = 0;
          this.lastPongTime = Date.now();
          
          // Start heartbeat to keep connection alive
          this.startHeartbeat();
          
          // Start periodic refresh of active reservation
          this.startRefreshInterval();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onerror = (event) => {
          console.error('Active reservation WebSocket error:', event);
        };

        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          // WebSocket closed
          
          // Stop heartbeat
          this.stopHeartbeat();
          this.stopRefreshInterval();
          
          if (this.statusSubject.value === 'connected') {
            this.statusSubject.next('disconnected');
            // ALWAYS attempt to reconnect - we have 15 seconds before losing reservation
            this.attemptReconnect();
          } else if (this.statusSubject.value === 'connecting') {
            this.statusSubject.next('error');
            this.attemptReconnect();
          }
        };

      } catch (error) {
        console.error('Failed to create active reservation WebSocket:', error);
        this.statusSubject.next('error');
        this.attemptReconnect();
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    // Handle pong responses
    if (event.data === 'pong' || event.data === '') {
      this.lastPongTime = Date.now();
      this.missedPongs = 0;
      return;
    }
    
    try {
      const message = JSON.parse(event.data) as ActiveReservation;
      this.lastMessage.set(message);
      this.messagesSubject.next(message);
    } catch (error) {
      // Might be a pong or other non-JSON message
      this.lastPongTime = Date.now();
    }
  }

  /**
   * Start sending heartbeat pings to keep the connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // Check if we've missed too many pongs
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.heartbeatIntervalMs * 2) {
          this.missedPongs++;
          console.warn(`Missed pong ${this.missedPongs}/${this.maxMissedPongs}, last pong ${timeSinceLastPong}ms ago`);
          
          if (this.missedPongs >= this.maxMissedPongs) {
            console.error('Too many missed pongs, reconnecting...');
            this.socket?.close();
            return;
          }
        }
        
        // Send ping
        try {
          this.socket.send('ping');
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.socket?.close();
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start periodic refresh of active reservation status
   */
  private startRefreshInterval(): void {
    this.stopRefreshInterval();
    
    this.refreshInterval = setInterval(() => {
      this.refreshActiveReservation();
    }, this.refreshIntervalMs);
  }

  private stopRefreshInterval(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh active reservation by calling mayPass endpoint
   */
  async refreshActiveReservation(): Promise<boolean> {
    const sessionId = this.getSessionCookie();
    if (!sessionId) return false;
    
    try {
      const response = await fetch(`${environment.API_URL}/v2/waiting/${sessionId}/pass`);
      const canPass = response.status === 200;
      
      if (!canPass) {
        console.warn('Active reservation check failed - may have been removed');
      }
      
      return canPass;
    } catch (error) {
      console.error('Error refreshing active reservation:', error);
      return false;
    }
  }

  private getSessionCookie(): string | undefined {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('__session='))
      ?.split('=')[1];
  }

  /**
   * Aggressive reconnection to beat the 15s backend timeout
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for active reservations');
      this.statusSubject.next('error');
      return;
    }

    this.reconnectAttempts++;
    
    // Aggressive reconnection: start fast, cap early
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    
      // Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}
    this.statusSubject.next('reconnecting');

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.createConnection();
      } catch (error) {
        console.error('Active reservation reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Manually reconnect - resets attempt counter
   */
  reconnect(): void {
    console.log('Manual reconnection triggered');
    this.reconnectAttempts = 0;
    this.closeSocket();
    this.createConnection().catch(console.error);
  }

  /**
   * Force immediate reconnection without delay
   */
  forceReconnect(): void {
    console.log('Force reconnection triggered');
    this.reconnectAttempts = 0;
    this.cleanup();
    this.createConnection().catch(console.error);
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    this.cleanup();
    this.statusSubject.next('disconnected');
  }

  private closeSocket(): void {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      
      if (this.socket.readyState === WebSocket.OPEN || 
          this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
    this.stopRefreshInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.closeSocket();
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get time since last successful heartbeat
   */
  getTimeSinceLastHeartbeat(): number {
    return Date.now() - this.lastPongTime;
  }
}
