import { Injectable, signal, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Order, Ticket, Customer } from '@ticket-system/models/order';
import { TicketService } from './ticket.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';
import { LoginToken, Seat } from '@ticket-system/models/order';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private ticketService = inject(TicketService);

  private initialOrderData: Order = {
    id: '',
    customer: {
      firstName: '',
      lastName: '',
      mailAddress: '',
      phoneNumber: '',
      schoolClass: '',
      isMale: true,
      street: '',
      streetNumber: '',
      zipCode: '',
      town: '',
    },
    order: {
      status: 'WAITING',
      orderDate: new Date(),
      tickets: [],
      seats: [],
    },
  };

  private orderTickets = signal<Ticket[]>([]);
  private orderSeats = signal<Seat[]>([]);
  private orderPersonalInfo = signal<Customer>(this.initialOrderData.customer);
  private orderTotal = signal<number>(0);
  private orderId = signal<string | undefined>(undefined);

  constructor(private httpClient: HttpClient) { }

  async getAvailableTickets(): Promise<Ticket[]> {
    const studentTicketPrice = await this.ticketService.getStudentTicketPrice();
    const externalTicketPrice =
      await this.ticketService.getExternalTicketPrice();
    const graduateTicketPrice = 0;

    return [
      { price: studentTicketPrice, type: 'STUDENT', id: '', isPhysical: false },
      {
        price: externalTicketPrice,
        type: 'EXTERNAL',
        id: '',
        isPhysical: false,
      },
      {
        price: graduateTicketPrice,
        type: 'GRADUATE',
        id: '',
        isPhysical: false,
      },
    ];
  }

  updateTickets(tickets: Ticket[]) {
    this.orderTickets.set(tickets);
    this.recalculateTotal();

    localStorage.setItem('tickets', JSON.stringify(tickets));
  }

  updateSeats(seats: Seat[]) {
    this.orderSeats.set(seats);
    this.recalculateTotal();
    sessionStorage.setItem('seats', JSON.stringify(seats));
  }

  deleteActiveReservation() {
    const sessionId = localStorage.getItem('sessionId');
    firstValueFrom(
      this.httpClient.delete(`${environment.API_URL}/v2/waiting/${sessionId}`)
    );
  }

  updatePersonalInfo(personalInfo: Customer) {
    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
    this.orderPersonalInfo.set(personalInfo);
  }

  private recalculateTotal() {
    const total = this.orderTickets().reduce(
      (sum, ticket) => sum + ticket.price,
      0
    );
    const seats = this.orderSeats().reduce((sum, seat) => sum + seat.price, 0);
    this.orderTotal.set(total + seats);
  }

  resetOrder() {
    this.orderTickets.set([]);
    this.orderSeats.set([]);
    this.orderPersonalInfo.set(this.initialOrderData.customer);
    this.orderTotal.set(0);
    this.orderId.set(undefined);
    localStorage.clear();
    sessionStorage.clear();
  }

  getPersonalInfoFromSessionStorage(): Customer | null {
    const personalInfo = localStorage.getItem('personalInfo');
    return personalInfo ? JSON.parse(personalInfo) : null;
  }

  getPaymentInfoFromSessionStorage() {
    /*
    const paymentInfo = localStorage.getItem('paymentInfo');
    return paymentInfo ? JSON.parse(paymentInfo) : null;
    */

    return {
      method: 'credit-card',
    };
  }

  getTicketsFromSessionStorage() {
    const tickets = localStorage.getItem('tickets');
    return tickets ? JSON.parse(tickets) : null;
  }

  getSeatsFromSessionStorage() {
    const seats = sessionStorage.getItem('seats');

    if (seats) {
      try {
        return JSON.parse(seats);
      } catch (error) {
        console.error('Error parsing seats from sessionStorage:', error);
        return [];
      }
    }

    return [];
  }

  getOrder(): Order {
    const personalInfo = this.getPersonalInfoFromSessionStorage();
    const paymentInfo = this.getPaymentInfoFromSessionStorage();
    const tickets = this.getTicketsFromSessionStorage();
    const seats = this.getSeatsFromSessionStorage();

    return {
      id: '',
      customer: personalInfo!,
      order: {
        status: 'WAITING',
        orderDate: new Date(),
        tickets: tickets,
        seats: seats,
      },
    };
  }

  calculateTotal(tickets: Ticket[]) {
    return tickets.reduce((sum, ticket) => sum + ticket.price, 0);
  }

  async validateEmailDomain(email: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.httpClient.get<{ valid: boolean }>(
          `${environment.API_URL}/v2/user/validate-email`,
          { params: { email } }
        )
      );
      return result.valid;
    } catch {
      return true;
    }
  }

  async register(customer: Customer) {
    return firstValueFrom(
      this.httpClient.post(
        `${environment.API_URL}/v2/user/register`,
        {
          username: `${customer.firstName} ${customer.lastName}`,
          email: customer.mailAddress,
          password: customer.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
          responseType: 'text',
        }
      )
    );
  }

  async login(customer: Customer) {
    let token;
    token = firstValueFrom(
      this.httpClient.post<LoginToken>(
        `${environment.API_URL}/v2/user/login`,
        {
          email: customer.mailAddress,
          password: customer.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        }
      )
    );
    return token;
  }

  async sendVerificationCode(email: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.httpClient.post<{ sent: boolean }>(
          `${environment.API_URL}/v2/user/send-verification-code`,
          null,
          { params: { email } }
        )
      );
      return result.sent;
    } catch {
      return false;
    }
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.httpClient.post<{ valid: boolean }>(
          `${environment.API_URL}/v2/user/verify-code`,
          null,
          { params: { email, code } }
        )
      );
      return result.valid;
    } catch {
      return false;
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.httpClient.post<{ success: boolean }>(
          `${environment.API_URL}/v2/user/reset-password`,
          null,
          { params: { email, code, newPassword } }
        )
      );
      return result.success;
    } catch {
      return false;
    }
  }

  async fetchOrders(
    email: string | null,
    token: string | null
  ): Promise<Order[] | null> {
    try {
      return await firstValueFrom(
        this.httpClient.get<Order[]>(
          `${environment.API_URL}/v2/order/all/${email}/${token}`
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return null;
      }
      throw error; // Re-throw other errors
    }
  }
}
