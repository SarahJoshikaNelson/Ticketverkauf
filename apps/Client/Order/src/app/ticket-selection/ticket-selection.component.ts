import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ViewChild,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { OrderService } from '../order.service';
import { Seat, Ticket } from '@ticket-system/models';
import { TicketService } from '../ticket.service';
import { TicketWebSocketService } from '../ticket-web-socket.service';
import { BookService } from '../book.service';
import { TableSelectorComponent } from '../table-selector/table-selector.component';
import { SocketTicketCount } from '@ticket-system/models';
import { COLORS } from '../table-selector/colors';
import { TableWebSocketService } from '../table-web-socket.service';
import { NumberSelectComponent } from '../comps/number-select/number-select.component';
import { formatPrice } from '../../lib/utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ticket-selection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableSelectorComponent,
    NumberSelectComponent,
  ],
  templateUrl: './ticket-selection.component.html',
  styleUrl: './ticket-selection.component.css',
})
export class TicketSelectionComponent implements OnInit, OnDestroy {
  availableTickets = signal<Ticket[]>([]);
  selectedTickets = signal<Ticket[]>([]); // Digital tickets
  selectedPhysicalTickets = signal<Ticket[]>([]); // Physical tickets (separate)
  private ticketWebSocketSubscription?: Subscription;

  // O(1) count maps instead of O(n) filtering - CRITICAL FOR PERFORMANCE
  private digitalTicketCounts = signal<Map<string, number>>(new Map());
  private physicalTicketCounts = signal<Map<string, number>>(new Map());

  total = computed(() => {
    if (this.additionalChargeForPhysicalTicket() === undefined) {
      return 0;
    }

    const digitalTicketTotal = this.selectedTickets().reduce(
      (sum, ticket) => sum + ticket.price,
      0
    );
    const physicalTicketTotal = this.selectedPhysicalTickets().reduce(
      (sum, ticket) =>
        sum + ticket.price + this.additionalChargeForPhysicalTicket()!,
      0
    );
    const seatTotal = this.selectedSeats().reduce(
      (sum, seat) => sum + seat.price,
      0
    );
    return digitalTicketTotal + physicalTicketTotal + seatTotal;
  });
  ticketLimit = signal<number>(25); // Default, will be fetched from server
  isMobile = signal<boolean>(false);
  showLoginModal = signal<boolean>(false);

  additionalChargeForPhysicalTicket = signal<number | undefined>(undefined);

  salesProgress = signal<number>(100);
  totalTicketCount = signal<number>(1700);
  soldTicketCount = signal<number>(0);

  isStudentTicketAllowed = signal<boolean>(false);
  isGraduateTicketAllowed = signal<boolean>(false);

  selectedSeats = signal<Seat[]>([]);
  showTableSelectorModal = signal<boolean>(false);
  tableSelectorConnectionStatus = signal<
    'connected' | 'disconnected' | 'error'
  >('disconnected');
  layers = signal<any[]>([]);
  selectedLayerName = signal<string>('');
  private isInitialized = false;

  // Total count of all tickets (digital + physical)
  totalTicketsSelected = computed(
    () => this.selectedTickets().length + this.selectedPhysicalTickets().length
  );

  // Memoization caches to prevent recreating computed signals
  private maxTicketsByTypeCache = new Map<
    string,
    ReturnType<typeof computed<number>>
  >();
  private maxPhysicalTicketsByTypeCache = new Map<
    string,
    ReturnType<typeof computed<number>>
  >();
  private selectedTicketsCountByTypeCache = new Map<
    string,
    ReturnType<typeof computed<number>>
  >();
  private physicalTicketsCountByTypeCache = new Map<
    string,
    ReturnType<typeof computed<number>>
  >();

  // Max tickets calculation considers both digital and physical
  maxTicketsByType = (type: Ticket['type']) => {
    if (!this.maxTicketsByTypeCache.has(type)) {
      this.maxTicketsByTypeCache.set(
        type,
        computed(() => {
          const currentDigital = this.selectedTicketsCountByType(type)();
          const currentPhysical = this.physicalTicketsCountByType(type)();
          const totalSelected = this.totalTicketsSelected();
          const remaining = this.ticketLimit() - totalSelected + currentDigital;
          // STUDENT tickets: max 1 total (digital + physical combined)
          if (type === 'STUDENT') {
            const physical = this.physicalTicketsCountByType(type)();
            return Math.min(1 - physical, remaining);
          }
          return remaining;
        })
      );
    }
    return this.maxTicketsByTypeCache.get(type)!;
  };

  maxPhysicalTicketsByType = (type: Ticket['type']) => {
    if (!this.maxPhysicalTicketsByTypeCache.has(type)) {
      this.maxPhysicalTicketsByTypeCache.set(
        type,
        computed(() => {
          const currentDigital = this.selectedTicketsCountByType(type)();
          const currentPhysical = this.physicalTicketsCountByType(type)();
          const totalSelected = this.totalTicketsSelected();
          const remaining =
            this.ticketLimit() - totalSelected + currentPhysical;
          // STUDENT tickets: max 1 total (digital + physical combined)
          if (type === 'STUDENT') {
            const digital = this.selectedTicketsCountByType(type)();
            return Math.min(1 - digital, remaining);
          }
          return remaining;
        })
      );
    }
    return this.maxPhysicalTicketsByTypeCache.get(type)!;
  };

  // O(1) lookup instead of O(n) filtering - CRITICAL PERFORMANCE FIX
  selectedTicketsCountByType = (ticketType: string) => {
    if (!this.selectedTicketsCountByTypeCache.has(ticketType)) {
      this.selectedTicketsCountByTypeCache.set(
        ticketType,
        computed(() => this.digitalTicketCounts().get(ticketType) || 0)
      );
    }
    return this.selectedTicketsCountByTypeCache.get(ticketType)!;
  };

  physicalTicketsCountByType = (ticketType: string) => {
    if (!this.physicalTicketsCountByTypeCache.has(ticketType)) {
      this.physicalTicketsCountByTypeCache.set(
        ticketType,
        computed(() => this.physicalTicketCounts().get(ticketType) || 0)
      );
    }
    return this.physicalTicketsCountByTypeCache.get(ticketType)!;
  };

  // Helper to update count maps
  private updateTicketCounts() {
    const digitalCounts = new Map<string, number>();
    this.selectedTickets().forEach((ticket) => {
      digitalCounts.set(ticket.type, (digitalCounts.get(ticket.type) || 0) + 1);
    });
    this.digitalTicketCounts.set(digitalCounts);

    const physicalCounts = new Map<string, number>();
    this.selectedPhysicalTickets().forEach((ticket) => {
      physicalCounts.set(
        ticket.type,
        (physicalCounts.get(ticket.type) || 0) + 1
      );
    });
    this.physicalTicketCounts.set(physicalCounts);
  }

  @ViewChild('modalTableSelector') modalTableSelector?: TableSelectorComponent;
  @ViewChild('inlineTableSelector')
  inlineTableSelector?: TableSelectorComponent;

  // Expose colors to template
  readonly colors = COLORS;

  // Format price according to ÖNORM (Austrian standard)
  formatPrice = formatPrice;

  private orderService = inject(OrderService);
  private router = inject(Router);
  private keycloakService = inject(KeycloakService);
  private ticketService = inject(TicketService);
  private ticketWebSocketService = inject(TicketWebSocketService);
  private bookService = inject(BookService);
  private tableWebSocketService = inject(TableWebSocketService);

  constructor() {
    effect(() => {});
  }

  async ngOnInit() {
    this.additionalChargeForPhysicalTicket.set(
      await this.ticketService.getAdditionalChargeForPhysicalTicket()
    );

    this.availableTickets.set(await this.orderService.getAvailableTickets());

    // Load tickets from session storage, separating digital and physical
    const storedTickets: Ticket[] =
      this.orderService.getTicketsFromSessionStorage() ?? [];
    this.selectedTickets.set(
      storedTickets.filter((t: Ticket) => !t.isPhysical)
    );
    this.selectedPhysicalTickets.set(
      storedTickets.filter((t: Ticket) => t.isPhysical)
    );
    // Update count maps for O(1) lookups
    this.updateTicketCounts();

    const seatsFromStorage =
      this.orderService.getSeatsFromSessionStorage() ?? [];
    this.selectedSeats.set(seatsFromStorage);

    this.isStudentTicketAllowed.set(
      await this.ticketService.getAllowanceOfTicket()
    );
    this.isGraduateTicketAllowed.set(
      await this.ticketService.getAllowanceOfGraduateTicket()
    );

    this.totalTicketCount.set(await this.ticketService.getMaxTicketCount());
    this.soldTicketCount.set(await this.bookService.getBookedTickets());

    // Fetch the max tickets per order limit from server
    try {
      const maxPerOrder = await this.ticketService.getMaxTicketCountPerOrder();
      this.ticketLimit.set(maxPerOrder);
    } catch (error) {
      console.warn(
        'Could not fetch max ticket count per order, using default:',
        this.ticketLimit()
      );
    }

    this.fetchSalesProgress().catch(err => {
      console.error('Failed to connect to ticket WebSocket:', err);
    });

    // Set CSS custom properties for colors
    this.setColorProperties();

    // Mark as initialized after everything is loaded
    this.isInitialized = true;

    // Subscribe to layers so the ticket selector can render the layer select
    this.tableWebSocketService.layers$.subscribe((layers) => {
      if (layers && layers.length > 0) {
        this.layers.set(layers);
        if (!this.selectedLayerName()) {
          this.selectedLayerName.set(layers[0].name);
        }
      } else {
        this.layers.set([]);
        this.selectedLayerName.set('');
      }
    });

    // Also attempt to actively load layers (surface errors in console)
    try {
      this.tableWebSocketService
        .loadLayers()
        .then((loaded) => {
          if (loaded && loaded.length > 0) {
            this.layers.set(loaded);
            if (!this.selectedLayerName()) {
              this.selectedLayerName.set(loaded[0].name);
            }
          }
        })
        .catch((err) => {
          console.error(
            'Failed to load layers in TicketSelectionComponent:',
            err
          );
        });
    } catch (err) {
      console.error('Error calling loadLayers:', err);
    }
  }

  onLayerSelect(layerName: string) {
    this.selectedLayerName.set(layerName);
    // Inform both inline and modal table selectors (if present)
    try {
      if (
        this.inlineTableSelector &&
        typeof this.inlineTableSelector.onLayerChange === 'function'
      ) {
        this.inlineTableSelector.onLayerChange(layerName);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (
        this.modalTableSelector &&
        typeof this.modalTableSelector.onLayerChange === 'function'
      ) {
        this.modalTableSelector.onLayerChange(layerName);
      }
    } catch (e) {
      // ignore
    }
  }

  private setColorProperties() {
    // Set CSS custom properties for use in CSS
    document.documentElement.style.setProperty(
      '--seat-unselectable-color',
      this.colors.SEAT_UNSELECTABLE
    );
    document.documentElement.style.setProperty(
      '--seat-selectable-table-color',
      this.colors.SEAT_SELECTABLE_TABLE
    );
  }

  async fetchSalesProgress() {
    // Clean up existing subscription if any
    if (this.ticketWebSocketSubscription) {
      this.ticketWebSocketSubscription.unsubscribe();
    }

    // Get current ticket count from stored selection
    const currentTicketCount =
      this.selectedTickets().length + this.selectedPhysicalTickets().length;

    // Don't send initial count immediately - let the server send us the current state first
    // Only connect without initial count to avoid triggering broadcasts on page load
    this.ticketWebSocketSubscription = (
      await this.ticketWebSocketService.connect()
    ).subscribe((v1: SocketTicketCount) => {
      try {
        this.soldTicketCount.set(v1.count);
        this.salesProgress.set(
          100 -
            Math.round(
              (this.soldTicketCount() / this.totalTicketCount()) * 100
            )
        );
      } catch (e) {
        console.error('Error updating ticket count from WebSocket:', e);
      }
    });

    // Send ticket count after a short delay to ensure connection is established
    // and to avoid race conditions
    setTimeout(() => {
      if (currentTicketCount > 0) {
        this.ticketWebSocketService.sendTicketCount(currentTicketCount);
      }
    }, 300);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.ticketWebSocketSubscription) {
      this.ticketWebSocketSubscription.unsubscribe();
    }
    this.ticketWebSocketService.close();
  }

  getSalesStatusClass(): string {
    const progress = this.salesProgress();
    if (progress > 80) return 'low-sales';
    if (progress > 50) return 'medium-sales';
    return 'high-sales';
  }

  /**
   * Get the number of remaining available tickets
   */
  getRemainingTickets(): number {
    return this.totalTicketCount() - this.soldTicketCount();
  }

  /**
   * Get badge class for remaining tickets indicator (styled like login badge)
   */
  getRemainingTicketsBadgeClass(): string {
    const remaining = this.getRemainingTickets();
    const total = this.totalTicketCount();
    const percentage = (remaining / total) * 100;

    if (percentage <= 10) {
      return 'border-red-500 text-red-700 bg-red-100';
    } else if (percentage <= 25) {
      return 'border-orange-500 text-orange-700 bg-orange-100';
    } else if (percentage <= 50) {
      return 'border-yellow-500 text-yellow-700 bg-yellow-100';
    } else {
      return 'border-green-500 text-green-700 bg-green-100';
    }
  }

  updateQuantity(ticket: Ticket, isIncrement: boolean) {
    if (isIncrement) {
      this.selectedTickets.update((tickets) => [
        ...tickets,
        { ...ticket, isPhysical: false },
      ]);
    } else {
      const remove = this.selectedTickets().findIndex(
        (t) => t.type === ticket.type
      );

      if (remove !== -1) {
        this.selectedTickets.update((tickets) =>
          tickets.filter((_, i) => i !== remove)
        );
      }
    }

    this.updateTicketCounts();
    this.saveAllTickets();
  }

  updatePhysicalQuantity(ticket: Ticket, isIncrement: boolean) {
    if (isIncrement) {
      this.selectedPhysicalTickets.update((tickets) => [
        ...tickets,
        { ...ticket, isPhysical: true },
      ]);
    } else {
      const remove = this.selectedPhysicalTickets().findIndex(
        (t) => t.type === ticket.type
      );

      if (remove !== -1) {
        this.selectedPhysicalTickets.update((tickets) =>
          tickets.filter((_, i) => i !== remove)
        );
      }
    }

    this.updateTicketCounts();
    this.saveAllTickets();
  }

  private saveAllTickets() {
    const allTickets = [
      ...this.selectedTickets(),
      ...this.selectedPhysicalTickets(),
    ];
    this.orderService.updateTickets(allTickets);
    this.ticketWebSocketService.sendTicketCount(allTickets.length);
  }

  updateSeatSelection() {
    if (this.isInitialized) {
      this.orderService.updateSeats(this.selectedSeats());
    }
  }

  onConnectionStatusChange(status: 'connected' | 'disconnected' | 'error') {
    this.tableSelectorConnectionStatus.set(status);
  }

  // Computed signal to group seats by table (prevents recalculation on every change detection)
  groupedSeatsByTable = computed(() => {
    const grouped = new Map<string, Seat[]>();

    // Group seats by table name
    this.selectedSeats().forEach((seat) => {
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
  });

  // Keep the method for backward compatibility, but now it just returns the computed value
  getGroupedSeatsByTable(): {
    tableName: string;
    seats: Seat[];
    totalPrice: number;
  }[] {
    return this.groupedSeatsByTable();
  }

  removeTableGroup(tableGroup: {
    tableName: string;
    seats: Seat[];
    totalPrice: number;
  }) {
    // Remove seats one by one, like clicking them again
    const seatIdsToRemove = tableGroup.seats.map((seat) => seat.id);

    // Update local selection
    this.selectedSeats.update((seats) =>
      seats.filter((s) => !seatIdsToRemove.includes(s.id))
    );

    // Notify WebSocket service to update other users and refresh the visual state
    this.tableWebSocketService.sendSeatUnselection(seatIdsToRemove);

    this.updateSeatSelection();
  }

  // getTicketPriceCalculation(ticket: Ticket): string {
  //   const count = this.selectedTicketsCountByType(ticket.type)();
  //   if (count === 0) {
  //     return '';
  //   }
  //   if (!this.additionalChargeForPhysicalTicket()) {
  //     return 'loading...';
  //   }

  //   const shownTicketPrice =
  //     ticket.price + this.additionalChargeForPhysicalTicket()!;

  //   if (count === 1) {
  //     return `€ ${shownTicketPrice.toFixed(2).replace('.', ',')}`;
  //   } else {
  //     return `€ ${shownTicketPrice
  //       .toFixed(2)
  //       .replace('.', ',')} \u00B7 ${count}`;
  //   }
  // }

  getDigitalTicketPriceCalculation(ticket: Ticket): string {
    const count = this.selectedTicketsCountByType(ticket.type)();
    if (count === 0) {
      return '';
    }

    if (count === 1) {
      return formatPrice(ticket.price);
    }
    return `${formatPrice(ticket.price)} × ${count}`;
  }

  getPhysicalTicketPriceCalculation(ticket: Ticket): string {
    const count = this.physicalTicketsCountByType(ticket.type)();
    const physicalCharge = this.additionalChargeForPhysicalTicket() || 0;
    const totalPrice = ticket.price + physicalCharge;

    if (count === 0) {
      return '';
    }

    if (count === 1) {
      return `${formatPrice(ticket.price)} + ${formatPrice(physicalCharge)}`;
    }
    return `(${formatPrice(ticket.price)} + ${formatPrice(
      physicalCharge
    )}) × ${count}`;
  }

  getDigitalTicketTotalPrice(ticket: Ticket): number {
    const count = this.selectedTicketsCountByType(ticket.type)();
    return ticket.price * count;
  }

  getPhysicalTicketTotalPrice(ticket: Ticket): number {
    const count = this.physicalTicketsCountByType(ticket.type)();
    const physicalCharge = this.additionalChargeForPhysicalTicket() || 0;
    return (ticket.price + physicalCharge) * count;
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

  isLoggedIn(): boolean {
    return this.keycloakService.isLoggedIn();
  }

  login() {
    this.keycloakService.login({
      redirectUri: window.location.origin + '/tickets',
    });
  }

  logout() {
    this.keycloakService.logout(window.location.origin + '/tickets');
  }

  closeLoginModal() {
    this.showLoginModal.set(false);
  }

  openTableSelectorModal() {
    this.showTableSelectorModal.set(true);
    // Trigger resize after modal opens
    setTimeout(() => {
      if (this.modalTableSelector) {
        this.modalTableSelector.triggerResize();
      }
    }, 100);
  }

  closeTableSelectorModal() {
    this.showTableSelectorModal.set(false);
  }

  continueToPersonalInfo() {
    const allTickets = [
      ...this.selectedTickets().filter((ticket) => ticket.price > 0),
      ...this.selectedPhysicalTickets().filter((ticket) => ticket.price > 0),
    ];
    const selectedSeats = this.selectedSeats().filter((seat) => seat.price > 0);
    if (allTickets.length === 0 && selectedSeats.length === 0) {
      alert(
        'Bitte wählen Sie mindestens ein Ticket/Tisch aus, um fortzufahren.'
      );
      return;
    }

    this.orderService.updateTickets(allTickets);
    this.router.navigate(['/personal-data']);
  }
}
