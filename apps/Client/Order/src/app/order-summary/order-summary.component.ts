import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../order.service';
import { TicketService } from '../ticket.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Order, Customer } from '@ticket-system/models/order';
import { BookService } from '../book.service';
import { Seat } from '@ticket-system/models/order';
import { formatPrice } from '../../lib/utils';
import { environment } from '../../environments/environment';

const defaultOrder: Order = {
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

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.css',
})
export class OrderSummaryComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);
  private bookService = inject(BookService);
  private ticketService = inject(TicketService);

  isSubmitting = signal(false);
  stripeEnabled = signal(false);
  checkoutError = signal<string | null>(null);
  datenschutzUrl = signal(environment.WELCOME_URL + '/datenschutz');
  termsAccepted = signal(false);
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

  readonly order = signal<Order>(this.orderService.getOrder() || defaultOrder);

  ticketCount = computed(() => {
    return this.order().order.tickets?.length || 0;
  });

  // Format price according to ÖNORM (Austrian standard)
  formatPrice = formatPrice;

  /*paymentMethodName = computed(() => {
    const method = this.order().order.paymentInfo?.method;
    if (!method) return 'Unbekannt';

    switch (method) {
      case 'credit-card': return 'Kreditkarte';
      case 'paypal': return 'PayPal';
      case 'bank-transfer': return 'Überweisung';
      default: return 'Unbekannt';
    }
  });*/

  /*paymentDetails = computed(() => {
    const paymentInfo = this.order().order.paymentInfo;
    if (!paymentInfo || !paymentInfo.method) return '';

    switch (paymentInfo.method) {
      case 'credit-card':
        return `**** **** **** ${paymentInfo.cardNumber?.slice(-4) || ''}`;
      case 'paypal':
        return paymentInfo.paypalEmail || '';
      case 'bank-transfer':
        return `${paymentInfo.bankName || ''} / ${paymentInfo.accountHolder || ''}`;
      default:
        return '';
    }
  });*/

  async ngOnInit(): Promise<void> {
    this.stripeEnabled.set(await this.bookService.isStripeEnabled());

    const additionalCharge =
      await this.ticketService.getAdditionalChargeForPhysicalTicket();
    this.additionalChargeForPhysicalTicket.set(additionalCharge);

    const student = this.order().order.tickets.find(
      (t) => t.type === 'STUDENT'
    );
    const graduate = this.order().order.tickets.find(
      (t) => t.type === 'GRADUATE'
    );
    const external = this.order().order.tickets.find(
      (t) => t.type === 'EXTERNAL'
    );

    this.mappedTickets.set(
      [
        {
          type: 'STUDENT',
          price: student?.price || 0,
          quantity: this.order().order.tickets.filter(
            (t) => t.type === 'STUDENT'
          ).length,
          physicalQuantity: this.order().order.tickets.filter(
            (t) => t.type === 'STUDENT' && t.isPhysical
          ).length,
        },
        {
          type: 'GRADUATE',
          price: graduate?.price || 0,
          quantity: this.order().order.tickets.filter(
            (t) => t.type === 'GRADUATE'
          ).length,
          physicalQuantity: this.order().order.tickets.filter(
            (t) => t.type === 'GRADUATE' && t.isPhysical
          ).length,
        },
        {
          type: 'EXTERNAL',
          price: external?.price || 0,
          quantity: this.order().order.tickets.filter(
            (t) => t.type === 'EXTERNAL'
          ).length,
          physicalQuantity: this.order().order.tickets.filter(
            (t) => t.type === 'EXTERNAL' && t.isPhysical
          ).length,
        },
      ].filter((t) => t.quantity > 0)
    );

    this.seats.set(this.order().order.seats);

    console.log('seats 3:', this.seats());
  }

  updateTermsAccepted(value: boolean): void {
    this.termsAccepted.set(value);
  }

  goBack(): void {
    this.router.navigate(['/personal-data']);
  }

  async submitOrder(): Promise<void> {
    if (!this.termsAccepted() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.checkoutError.set(null);

    if (this.stripeEnabled()) {
      try {
        const response = await this.bookService.checkout(
          this.order().customer,
          this.order().order.tickets,
          this.order().order.seats
        );
        window.location.href = response;
      } catch (error: any) {
        console.error('Stripe checkout failed:', error);
        const status = error?.status;
        const serverMsg = error?.error?.message;
        if (status === 409) {
          this.checkoutError.set(
            serverMsg || 'Ihre Bestellung konnte nicht abgeschlossen werden, da Tickets oder Sitzplätze in der Zwischenzeit vergeben wurden.'
          );
        } else {
          this.checkoutError.set(
            'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
          );
        }
        this.isSubmitting.set(false);
      }
    } else {
      try {
        await this.bookService.book(
          this.order().customer,
          this.order().order.tickets,
          this.order().order.seats
        );
        this.orderService.deleteActiveReservation();
        this.router.navigate(['/confirmation']);
      } catch (error: any) {
        console.error('Error submitting order:', error);
        const serverMsg = error?.error?.message || error?.error;
        this.checkoutError.set(
          typeof serverMsg === 'string' && serverMsg.length > 0
            ? serverMsg
            : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
        );
        this.isSubmitting.set(false);
      }
    }
  }

  handleSubmitClick(): void {
    console.log('Submit button clicked');
    this.submitOrder();
  }

  getTotalTicketPrice(): number {
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

  getSeatPrice(seat: Seat): number {
    return seat.price;
  }
  getTotalSeatPrice(): number {
    return this.seats().reduce((sum, seat) => sum + seat.price, 0);
  }

  getTotalPrice(): number {
    return this.getTotalTicketPrice() + this.getTotalSeatPrice();
  }

  getAllSeatAmount(): number {
    return this.seats().length;
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

  /**
   * Get human-readable ticket type name
   */
  getTicketTypeName(type: string): string {
    switch (type) {
      case 'STUDENT':
        return 'Schülerermäßigung';
      case 'EXTERNAL':
        return 'Standardeintritt';
      case 'GRADUATE':
        return 'Absolvent';
      default:
        return type;
    }
  }

  /**
   * Get the quantity of digital (non-physical) tickets
   */
  getDigitalQuantity(ticket: {
    type: string;
    price: number;
    quantity: number;
    physicalQuantity: number;
  }): number {
    return ticket.quantity - ticket.physicalQuantity;
  }
}
