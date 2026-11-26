import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import {
  Room,
  Table,
  OrderRequest,
  Ticket,
  Customer,
} from '@ticket-system/models';
import { Seat } from '@ticket-system/models/requests';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  URI: string = '';

  constructor(private httpClient: HttpClient) {
    this.URI = environment.API_URL + '/api/v1/reservation/';
  }

  async getAllRooms() {
    return await firstValueFrom<Room[]>(
      this.httpClient.get<Room[]>(
        environment.API_URL + '/api/v1/reservation/rooms'
      )
    );
  }

  async getAllTablesFromRoom(id: string) {
    console.log(
      'fetching to ' + environment.API_URL + 'room/' + id + '/tables'
    );
    return await firstValueFrom<Table[]>(
      this.httpClient.get<Table[]>(
        environment.API_URL + '/api/v1/reservation/room/' + id + '/tables'
      )
    );
  }

  async getBookedTickets() {
    return await firstValueFrom<number>(
      this.httpClient.get<number>(
        environment.API_URL + '/api/v2/reservation/booked-tickets'
      )
    );
  }

  async sendSeatSelection(roomid: string, seatid: string) {
    return await firstValueFrom(
      this.httpClient.post(
        this.URI + 'room/' + roomid + '/selectedseat/',
        seatid
      )
    );
  }

  async bookTickets(
    customer: Customer,
    tickets: ('STUDENT' | 'EXTERNAL' | 'GRADUATE')[],
    seats: Seat[] | null
  ): Promise<Ticket[]> {
    let reqBody: OrderRequest = {
      customer: customer,
      tickets: tickets,
    } as OrderRequest;
    if (seats) {
      reqBody = {
        customer: customer,
        tickets: tickets,
        seats: seats,
      } as OrderRequest;
    }

    console.log(reqBody);

    return await firstValueFrom<Ticket[]>(
      this.httpClient.post<Ticket[]>(
        this.URI + 'book',
        JSON.stringify(reqBody),
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        }
      )
    );
  }

  async getMaxTicketCount() {
    console.log('fetching max ticket count');
    return await firstValueFrom<number>(
      this.httpClient.get<number>(
        environment.API_URL + '/api/v1/admin/ticket/count'
      )
    );
  }

  async getStudentTicketPrice() {
    return await firstValueFrom<number>(
      this.httpClient.get<number>(
        environment.API_URL + '/api/v1/admin/ticket/student'
      )
    );
  }

  async getExternalTicketPrice() {
    return await firstValueFrom<number>(
      this.httpClient.get<number>(
        environment.API_URL + '/api/v1/admin/ticket/extern'
      )
    );
  }

  async getAllowanceOfTicket() {
    return await firstValueFrom<boolean>(
      this.httpClient.get<boolean>(
        environment.API_URL + '/api/v1/admin/ticket/student/allowed'
      )
    );
  }

  async getAllowanceOfGradTicket() {
    return await firstValueFrom<number>(
      this.httpClient.get<number>(
        environment.API_URL + '/api/v1/admin/ticket/graduate/allowed'
      )
    );
  }

  async getPhysicalTicketAdditionalCharge() {
    return (
      await firstValueFrom<{ additionalChargeForPhysicalTicket: number }>(
        this.httpClient.get<{ additionalChargeForPhysicalTicket: number }>(
          environment.API_URL + '/api/v2/ticket/physical/additional-charge'
        )
      )
    ).additionalChargeForPhysicalTicket;
  }
}
