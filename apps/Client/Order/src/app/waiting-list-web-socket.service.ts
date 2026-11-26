import { Injectable, signal, OnDestroy } from '@angular/core';
import { WaitingListSummary } from '@ticket-system/models';
import { environment } from '../environments/environment';
import { Observable, Subject, BehaviorSubject, filter, takeUntil } from 'rxjs';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

@Injectable({
  providedIn: 'root'
})
export class WaitingListWebSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private destroy$ = new Subject<void>();
  
  // Reconnection settings
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Observable streams
  private readonly messagesSubject = new Subject<WaitingListSummary>();
  private readonly statusSubject = new BehaviorSubject<WebSocketStatus>('disconnected');
  private readonly errorSubject = new Subject<Event>();
  
  // Public observables
  readonly messages$ = this.messagesSubject.asObservable();
  readonly status$ = this.statusSubject.asObservable();
  readonly errors$ = this.errorSubject.asObservable();
  
  // Signal-based status for template usage
  readonly connectionStatus = signal<WebSocketStatus>('disconnected');
  readonly isConnected = signal<boolean>(false);
  readonly lastMessage = signal<WaitingListSummary | null>(null);

  constructor() {
    // Sync BehaviorSubject to signals
    this.status$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.connectionStatus.set(status);
      this.isConnected.set(status === 'connected');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  /**
   * Connect to the WebSocket server
   * Returns an observable of messages for backward compatibility
   */
  async connect(onRefresh?: (message: WaitingListSummary) => void): Promise<void> {
    // If already connected or connecting, don't create new connection
    if (this.socket?.readyState === WebSocket.OPEN || 
        this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.statusSubject.next('connecting');
    
    // Subscribe to messages if callback provided
    if (onRefresh) {
      this.messages$.pipe(takeUntil(this.destroy$)).subscribe(onRefresh);
    }

    return this.createConnection();
  }

  /**
   * Create WebSocket connection with proper error handling
   */
  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing connection
        this.closeSocket();
        
        console.log('Connecting to WebSocket at:', `${environment.WEBSOCKET_URL}/v2/waiting`);
        this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/v2/waiting`);

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.statusSubject.value !== 'connected') {
            console.error('WebSocket connection timeout');
            this.socket?.close();
            this.statusSubject.next('error');
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.socket.onopen = () => {
          this.clearConnectionTimeout();
          console.log('WebSocket connected successfully');
          this.statusSubject.next('connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.errorSubject.next(event);
          // Don't set status to error here, wait for onclose
        };

        this.socket.onclose = (event) => {
          this.clearConnectionTimeout();
          console.log('WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean);
          
          if (this.statusSubject.value === 'connected') {
            this.statusSubject.next('disconnected');
            // Attempt to reconnect if it wasn't a clean close
            if (!event.wasClean) {
              this.attemptReconnect();
            }
          } else if (this.statusSubject.value === 'connecting') {
            this.statusSubject.next('error');
            this.attemptReconnect();
          }
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.statusSubject.next('error');
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WaitingListSummary;
      console.log('Received waiting list update:', message);
      
      this.lastMessage.set(message);
      this.messagesSubject.next(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', event.data, error);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.statusSubject.next('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.statusSubject.next('reconnecting');

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.createConnection();
      } catch (error) {
        // Will automatically retry via onclose handler
        console.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
    return Math.min(exponentialDelay, maxDelay) + jitter;
  }

  /**
   * Send a message through the WebSocket
   */
  send(data: unknown): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Manually trigger a reconnection
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.closeSocket();
    this.createConnection().catch(console.error);
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    this.cleanup();
    this.statusSubject.next('disconnected');
  }

  /**
   * Close socket without updating status
   */
  private closeSocket(): void {
    if (this.socket) {
      // Remove event handlers to prevent reconnection attempts
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

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    this.clearConnectionTimeout();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.closeSocket();
    this.reconnectAttempts = 0;
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.statusSubject.value;
  }

  /**
   * Check if currently connected
   */
  isCurrentlyConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
