import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SocketTicketCount } from '@ticket-system/models';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketWebSocketService {
  private socket!: WebSocket;
  private messagesSubject: Subject<SocketTicketCount> = new Subject<SocketTicketCount>();

  constructor() {
  }

  async connect(): Promise<Observable<SocketTicketCount>> {
    if (this.socket) {
      this.socket.close();
    }
    console.log('Connecting to WebSocket ' + environment.WEBSOCKET_URL + '/ticket');
    this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/ticket`);

    this.socket.onopen = (event) => {
      console.log('WebSocket connection opened:', event);
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SocketTicketCount;
      this.messagesSubject.next(message);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
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
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(count + "");
    } else {
      console.error('WebSocket is not open. Ready state:', this.socket.readyState);
    }
  }
}
