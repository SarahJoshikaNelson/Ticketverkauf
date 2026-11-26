import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SocketTicketCount } from '@ticket-system/models';
import { environment } from '../environments/environment';
import { isE2EMode } from './e2e-mode';

@Injectable({
  providedIn: 'root'
})
export class TicketWebSocketService {
  private socket!: WebSocket;
  private messagesSubject: Subject<SocketTicketCount> = new Subject<SocketTicketCount>();
  private sendDebounceTimer: any = null;
  private lastSentCount: number = -1;

  constructor() {
  }

  async connect(initialTicketCount?: number): Promise<Observable<SocketTicketCount>> {
    if (isE2EMode()) {
      return this.messagesSubject.asObservable();
    }

    if (this.socket) {
      this.socket.close();
    }
    console.log("Connecting to WebSocket at:", `${environment.WEBSOCKET_URL}/ticket`);
    this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/ticket`);

    this.socket.onopen = () => {
      console.log('TicketWebSocket connected');
      // DON'T send initial ticket count immediately - causes broadcast storm
      // Let the caller use sendTicketCount() after a delay if needed
      if (initialTicketCount !== undefined && initialTicketCount > 0) {
        console.log(`Initial ticket count ${initialTicketCount} will be sent by caller after delay`);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketTicketCount;
        this.messagesSubject.next(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    return this.messagesSubject.asObservable();
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  sendTicketCount(count: number): void {
    // Debounce to prevent flooding the server with updates
    if (this.sendDebounceTimer) {
      clearTimeout(this.sendDebounceTimer);
    }

    // If count hasn't changed, don't send
    if (this.lastSentCount === count) {
      return;
    }

    this.sendDebounceTimer = setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(count + "");
        this.lastSentCount = count;
      } else {
        console.error('WebSocket is not open. Ready state:', this.socket?.readyState);
      }
    }, 100); // Debounce for 100ms
  }
}
