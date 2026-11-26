import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { formatPrice } from '../../lib/utils';
import { Customer, Ticket, Seat } from '@ticket-system/models/order';

interface SessionDetails {
  customer: Customer;
  tickets: Ticket[];
  seats: Seat[];
  paymentStatus: string;
  amountTotal: number;
  currency: string;
}

interface MappedTicket {
  type: string;
  price: number;
  quantity: number;
  physicalQuantity: number;
}

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.css',
})
export class CheckoutSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  loading = signal(true);
  error = signal<string | null>(null);
  session = signal<SessionDetails | null>(null);
  mappedTickets = signal<MappedTicket[]>([]);

  formatPrice = formatPrice;

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (!sessionId) {
      this.error.set('Keine Session-ID gefunden.');
      this.loading.set(false);
      return;
    }

    try {
      const details = await firstValueFrom(
        this.http.get<SessionDetails>(
          `${environment.API_URL}/v2/checkout/session/${sessionId}`
        )
      );
      this.session.set(details);
      this.buildMappedTickets(details.tickets);
    } catch {
      this.error.set(
        'Bestelldetails konnten nicht geladen werden. Bitte überprüfen Sie Ihre E-Mail für die Bestätigung.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private buildMappedTickets(tickets: Ticket[]): void {
    const types = [...new Set(tickets.map((t) => t.type))];
    this.mappedTickets.set(
      types
        .map((type) => {
          const ofType = tickets.filter((t) => t.type === type);
          return {
            type,
            price: ofType[0]?.price ?? 0,
            quantity: ofType.length,
            physicalQuantity: ofType.filter((t) => t.isPhysical).length,
          };
        })
        .filter((t) => t.quantity > 0)
    );
  }

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

  getDigitalQuantity(ticket: MappedTicket): number {
    return ticket.quantity - ticket.physicalQuantity;
  }

  getGroupedSeatsByTable(): {
    tableName: string;
    seats: Seat[];
    totalPrice: number;
  }[] {
    const seats = this.session()?.seats ?? [];
    const grouped = new Map<string, Seat[]>();
    seats.forEach((seat) => {
      const tableName = seat.table || seat.tableName || 'Unbekannter Tisch';
      if (!grouped.has(tableName)) {
        grouped.set(tableName, []);
      }
      grouped.get(tableName)!.push(seat);
    });
    return Array.from(grouped.entries()).map(([tableName, seats]) => ({
      tableName,
      seats,
      totalPrice: seats.reduce((sum, s) => sum + s.price, 0),
    }));
  }

  getTotalPrice(): number {
    const session = this.session();
    if (!session) return 0;
    if (session.amountTotal) return session.amountTotal / 100;
    const ticketTotal = session.tickets.reduce((s, t) => s + t.price, 0);
    const seatTotal = (session.seats ?? []).reduce((s, seat) => s + seat.price, 0);
    return ticketTotal + seatTotal;
  }

  goToHome() {
    window.location.href = environment.WELCOME_URL;
  }
}
