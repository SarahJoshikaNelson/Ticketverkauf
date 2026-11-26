import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';
import { TicketService } from '../ticket.service';
import { Order } from '@ticket-system/models/order';
import { environment } from '../../environments/environment';
import { Seat } from '@ticket-system/models/order';
import { formatPrice } from '../../lib/utils';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.css',
})
export class OrderConfirmationComponent implements OnInit {
  private orderService = inject(OrderService);
  private ticketService = inject(TicketService);
  order = signal<Order | undefined>(undefined);
  mappedTickets = signal<
    {
      type: string;
      price: number;
      quantity: number;
      physicalQuantity: number;
    }[]
  >([]);
  seats = signal<Seat[]>([]);
  additionalChargeForPhysicalTicket = signal<number>(0);

  formatPrice = formatPrice;

  constructor() { }

  async ngOnInit(): Promise<void> {
    // Load additional charge for physical tickets
    const additionalCharge =
      await this.ticketService.getAdditionalChargeForPhysicalTicket();
    this.additionalChargeForPhysicalTicket.set(additionalCharge);

    this.order.set(this.orderService.getOrder());
    this.orderService.resetOrder();
    this.orderService.deleteActiveReservation();

    const student = this.order()!.order.tickets.find(
      (t) => t.type === 'STUDENT'
    );
    const graduate = this.order()!.order.tickets.find(
      (t) => t.type === 'GRADUATE'
    );
    const external = this.order()!.order.tickets.find(
      (t) => t.type === 'EXTERNAL'
    );

    this.mappedTickets.set(
      [
        {
          type: 'STUDENT',
          price: student?.price || 0,
          quantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'STUDENT'
          ).length,
          physicalQuantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'STUDENT' && t.isPhysical
          ).length,
        },
        {
          type: 'GRADUATE',
          price: graduate?.price || 0,
          quantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'GRADUATE'
          ).length,
          physicalQuantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'GRADUATE' && t.isPhysical
          ).length,
        },
        {
          type: 'EXTERNAL',
          price: external?.price || 0,
          quantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'EXTERNAL'
          ).length,
          physicalQuantity: this.order()!.order.tickets.filter(
            (t) => t.type === 'EXTERNAL' && t.isPhysical
          ).length,
        },
      ].filter((t) => t.quantity > 0)
    );

    this.seats.set(this.order()!.order.seats);

    console.log('Order Confirmation:', this.order());
  }

  returnToHome() {
    this.orderService.resetOrder();
    window.location.href = environment.WELCOME_URL;
  }

  goToOrderList() {
    this.orderService.resetOrder();
    window.location.href = environment.WELCOME_URL + '/orders';
  }

  getTotalTicketPrice() {
    return this.mappedTickets().reduce(
      (
        sum: number,
        ticket: {
          type: string;
          price: number;
          quantity: number;
          physicalQuantity: number;
        }
      ) => {
        const basePrice = ticket.price * ticket.quantity;
        const physicalCharge =
          ticket.physicalQuantity * this.additionalChargeForPhysicalTicket();
        return sum + basePrice + physicalCharge;
      },
      0
    );
  }

  getTotalSeatPrice(): number {
    return this.seats().reduce(
      (sum: number, seat: Seat) => sum + seat.price,
      0
    );
  }

  getTotalPrice() {
    return this.getTotalTicketPrice() + this.getTotalSeatPrice();
  }

  getGroupedSeatsByTable(): {
    tableName: string;
    seats: Seat[];
    totalPrice: number;
  }[] {
    const grouped = new Map<string, Seat[]>();

    // Group seats by table name
    this.seats().forEach((seat) => {
      const tableName = seat.table || 'Unbekannter Tisch';
      if (!grouped.has(tableName)) {
        grouped.set(tableName, []);
      }
      grouped.get(tableName)!.push(seat);
    });

    // Convert to array and calculate totals
    return Array.from(grouped.entries()).map(([tableName, seats]) => {
      const totalPrice = seats.reduce((sum, seat) => sum + seat.price, 0);
      return { tableName, seats, totalPrice };
    });
  }

  getTicketPriceCalculation(ticket: {
    type: string;
    price: number;
    quantity: number;
    physicalQuantity: number;
  }): string {
    if (ticket.quantity === 0) return '';

    const parts: string[] = [];

    // Base ticket price
    if (ticket.quantity === 1) {
      parts.push(formatPrice(ticket.price));
    } else {
      parts.push(`${formatPrice(ticket.price)} × ${ticket.quantity}`);
    }

    // Physical ticket charge
    if (ticket.physicalQuantity > 0) {
      const physicalCharge = this.additionalChargeForPhysicalTicket();
      if (ticket.physicalQuantity === 1) {
        parts.push(`${formatPrice(physicalCharge)} (physisch)`);
      } else {
        parts.push(
          `${formatPrice(physicalCharge)} × ${ticket.physicalQuantity
          } (physisch)`
        );
      }
    }

    return parts.join(' + ');
  }

  getPriceCalculationWithoutSolution(seats: Seat[]): string {
    // Group seats by price
    const priceGroups = new Map<number, number>();
    seats.forEach((seat) => {
      const count = priceGroups.get(seat.price) || 0;
      priceGroups.set(seat.price, count + 1);
    });

    // Create breakdown string without solution
    const breakdownParts: string[] = [];
    priceGroups.forEach((count, price) => {
      if (count === 1) {
        breakdownParts.push(formatPrice(price));
      } else {
        breakdownParts.push(`${formatPrice(price)} × ${count}`);
      }
    });

    return breakdownParts.join(' + ');
  }

  getDigitalQuantity(ticket: {
    type: string;
    price: number;
    quantity: number;
    physicalQuantity: number;
  }): number {
    return ticket.quantity - ticket.physicalQuantity;
  }

  getTicketTypeName(type: string): string {
    switch (type) {
      case 'STUDENT':
        return 'Schülerermäßigung';
      case 'EXTERNAL':
        return 'Standardeintritt';
      case 'GRADUATE':
        return 'Maturantenermäßigung';
      default:
        return type;
    }
  }
}
