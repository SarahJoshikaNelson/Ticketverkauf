import { Injectable } from '@angular/core';
import { Customer, Ticket } from '@ticket-system/models/order';
import { Order } from '@ticket-system/models/order';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Seat } from '@ticket-system/models/order';
import { isE2EMode } from './e2e-mode';

interface SeatRequestDTO {
  id: string;
  price: number;
  xposition: number;
  yposition: number;
  xlength: number;
  ylength: number;
}

interface OrderRequestDTO extends Omit<Order, 'seats' | 'id' | 'order'> {
  seats?: SeatRequestDTO[];
  tickets: Ticket[];
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookService {
  URI: string = '';

  constructor(private httpClient: HttpClient) {
    this.URI = `${environment.API_URL}/v2/reservation/`;
  }

  async isStripeEnabled(): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<{ enabled: boolean }>(
          `${environment.API_URL}/v2/checkout/stripe-enabled`
        )
      );
      return result.enabled;
    } catch {
      return false;
    }
  }

  async checkout(customer: Customer, tickets: Ticket[], seats: Seat[] | undefined): Promise<string> {
    // Pre-processing logic from book()
    let reqBody: OrderRequestDTO = {
      customer: customer,
      tickets: tickets,
      token: sessionStorage.getItem('non-student-auth-token') || ('' as string),
    };
    if (seats) {
      reqBody.seats = seats.map((seat: Seat) => ({
        id: seat.id,
        price: seat.price,
        xposition: seat.xposition,
        yposition: seat.yposition,
        xlength: seat.xlength,
        ylength: seat.ylength,
      }));
    }

    const response = await firstValueFrom(
      this.httpClient.post<{ location: string }>(
        `${environment.API_URL}/v2/checkout/create-checkout-session`,
        reqBody
      )
    );
    
    return response.location;
  }

  async book(
    customer: Customer,
    tickets: Ticket[],
    seats: Seat[] | undefined
  ): Promise<Ticket[]> {
    console.log('BookService.book called with:', { customer, tickets, seats });

    let reqBody: OrderRequestDTO = {
      customer: customer,
      tickets: tickets,
      token: sessionStorage.getItem('non-student-auth-token') || ('' as string),
    };
    if (seats) {
      reqBody.seats = seats.map((seat: Seat) => ({
        id: seat.id,
        price: seat.price,
        xposition: seat.xposition,
        yposition: seat.yposition,
        xlength: seat.xlength,
        ylength: seat.ylength,
      }));
    }

    console.log('Sending request to:', this.URI + 'bookOrder');
    console.log('Request body:', JSON.stringify(reqBody, null, 2));
    console.log(
      'Seat details being sent:',
      reqBody.seats?.map((s) => ({ id: s.id, price: s.price }))
    );

    try {
      const result = await firstValueFrom<Ticket[]>(
        this.httpClient.post<Ticket[]>(this.URI + 'bookOrder', reqBody, {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        })
      );
      console.log('Request successful, response:', result);
      return result;
    } catch (error: any) {
      console.error('Request failed with error:', error);
      throw error;
    }
  }

  async getBookedTickets() {
    if (isE2EMode()) {
      return 300;
    }
    return await firstValueFrom<number>(
      this.httpClient.get<number>(this.URI + 'booked-tickets')
    );
  }
}
