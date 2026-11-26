import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Table } from '@ticket-system/models';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TableWebSocketService {
  private socket!: WebSocket;
  private messagesSubject: Subject<Table[]> = new Subject<Table[]>();
  private username: string;

  constructor() {
    this.username = this.generateUsername();
  }

  private generateUsername(): string {
    return uuidv4();
  }

  async connect(roomName: string): Promise<Observable<Table[]>> {
    if (this.socket) {
      this.socket.close();
    }
    console.log('Connecting to WebSocket ' + roomName + ' as ' + this.username);
    this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/tables/${roomName}/user/${this.username}`);

    this.socket.onopen = (event) => {
      console.log('WebSocket connection opened:', event);
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message); // Log the message to the console

      if (Array.isArray(message)) {
        // Handle case where message is an array of tables
        const tables: Table[] = message;
        console.log('Received tables:', tables); // Log the tables to the console
        this.messagesSubject.next(tables);
      } else if (message.tables && Array.isArray(message.tables)) {
        // Handle case where message is an object containing a tables array
        const tables: Table[] = message.tables.map((tableString: string) => JSON.parse(tableString));
        console.log('Received tables from object:', tables); // Log the tables to the console
        this.messagesSubject.next(tables);
      } else {
        console.error('Unknown message format:', message);
      }
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

  sendTableSelection(tableId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(tableId);
    } else {
      console.error('WebSocket is not open. Ready state:', this.socket.readyState);
    }
  }
}
