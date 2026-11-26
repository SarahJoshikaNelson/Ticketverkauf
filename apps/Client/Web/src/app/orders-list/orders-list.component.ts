import { TicketService } from './../ticket.service';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { OrderService } from '../order.service';
import { Customer, Order } from '@ticket-system/models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginToken } from '@ticket-system/models/order';
import { ButtonComponent } from '../button/button.component';
import { AuthService } from '../auth.service';
import { formatPrice } from '../../lib/utils';

@Component({
  selector: 'app-orders-list',
  imports: [ReactiveFormsModule, FormsModule, ButtonComponent],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.css',
})
export class OrdersListComponent implements OnInit {
  private keycloakService = inject(KeycloakService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  orders = signal<Order[] | null>(null);
  ongoingNonStudentLogin = signal<boolean>(false);
  emailInput = signal<string>('');
  passwordInput = signal<string>('');

  // Password reset flow
  resetMode = signal<'none' | 'enter-email' | 'enter-code'>('none');
  // Plain properties for [(ngModel)] two-way binding (signals don't work with ngModel)
  resetEmail = '';
  resetCode = '';
  resetNewPassword = '';
  resetConfirmPassword = '';
  resetError = signal<string | null>(null);
  resetSuccess = signal<boolean>(false);
  resetLoading = signal<boolean>(false);

  orderOfWichTheTicketsAreBeingDownloaded = signal<string | undefined>(
    undefined,
  );

  ticketBeingDownloaded = signal<string | undefined>(undefined);
  billBeingDownloaded = signal<string | undefined>(undefined);
  allTicketsBeingDownloaded = signal<string | undefined>(undefined);
  
  openTicketsDropdowns = signal<Set<string>>(new Set());

  ticketsService = inject(TicketService);

  user = signal<string | undefined>(undefined);

  ordersTotalAmounts = new Map<Order, string | 'loading'>();

  ordersPageTitle = computed<string>(() => {
    if (this.user() !== undefined) {
      return `Bestellungen von ${this.user()}`;
    }

    return 'Meine Bestellungen';
  });

  async getOrders(): Promise<Order[] | null> {
    if (
      !this.keycloakService.isLoggedIn() &&
      localStorage.getItem('non-student-auth-token') == null
    ) {
      return null;
    }
    try {
      if (this.keycloakService.isLoggedIn()) {
        await this.keycloakService.getKeycloakInstance().loadUserProfile();
        const profile =
          await this.keycloakService.getKeycloakInstance().profile!;
        this.user.set(`${profile.firstName} ${profile.lastName}`);
        return await this.orderService.fetchOrders(profile.email!, null);
      }

      const emailInLocalStorage = localStorage.getItem(
        'non-student-auth-email',
      );

      if (emailInLocalStorage) {
        this.user.set(emailInLocalStorage);
      }

      return await this.orderService.fetchOrders(
        emailInLocalStorage,
        localStorage.getItem('non-student-auth-token'),
      );
    } catch (error) {
      console.error('Error fetching orders:', error);
      return null;
    }
  }

  async ngOnInit() {
    this.orders.set(await this.getOrders());

    for (const order of this.orders() ?? []) {
      await this.setTotalAmountOfOrder(order);
    }
  }

  studentLogin() {
    this.keycloakService.login({
      redirectUri: window.location.origin + '/orders',
    });
  }

  nonStudentLogin() {
    // Clear previous inputs and localStorage when opening the login form
    this.emailInput.set('');
    this.passwordInput.set('');
    this.ongoingNonStudentLogin.set(true);
  }

  async completeNonStudentLogin() {
    const customer: Customer = {
      firstName: '',
      lastName: '',
      mailAddress: this.emailInput(),
      password: this.passwordInput(),
      phoneNumber: '',
      schoolClass: '',
      isMale: true,
      street: '',
      streetNumber: '',
      zipCode: '',
      town: '',
    };
    try {
      let token: LoginToken | null;
      try {
        token = await this.orderService.login(customer);
      } catch (error: any) {
        console.error('Login error:', error);
        alert('Login fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Passwort.');
        return; // Don't proceed if login fails
      }
      // Clear old token and email before storing new ones
      localStorage.removeItem('non-student-auth-token');
      localStorage.removeItem('non-student-auth-email');
      
      // Store new token and email
      localStorage.setItem('non-student-auth-token', token.token);
      localStorage.setItem('non-student-auth-email', customer.mailAddress);
      
      this.ongoingNonStudentLogin.set(false);
      this.orders.set(await this.getOrders());
    } catch (error) {
      console.error('Unauthorized login:', error);
      alert('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  }

  logout() {
    this.authService.logout();
  }

  cancelNonStudentLogin() {
    this.emailInput.set('');
    this.passwordInput.set('');
    this.ongoingNonStudentLogin.set(false);
  }

  startPasswordReset() {
    this.resetMode.set('enter-email');
    this.resetEmail = this.emailInput();
    this.resetError.set(null);
    this.resetSuccess.set(false);
  }

  cancelPasswordReset() {
    this.resetMode.set('none');
    this.resetCode = '';
    this.resetNewPassword = '';
    this.resetConfirmPassword = '';
    this.resetError.set(null);
    this.ongoingNonStudentLogin.set(true);
  }

  async sendResetCode() {
    this.resetLoading.set(true);
    this.resetError.set(null);
    const sent = await this.orderService.sendVerificationCode(this.resetEmail);
    this.resetLoading.set(false);
    if (sent) {
      this.resetCode = '';
      this.resetMode.set('enter-code');
    } else {
      this.resetError.set('Kein Konto mit dieser E-Mail-Adresse gefunden.');
    }
  }

  async confirmPasswordReset() {
    if (this.resetNewPassword !== this.resetConfirmPassword) {
      this.resetError.set('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (this.resetNewPassword.length < 8) {
      this.resetError.set('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    this.resetLoading.set(true);
    this.resetError.set(null);
    const success = await this.orderService.resetPassword(
      this.resetEmail, this.resetCode, this.resetNewPassword
    );
    this.resetLoading.set(false);
    if (success) {
      this.resetSuccess.set(true);
      this.resetMode.set('none');
      this.emailInput.set(this.resetEmail);
      this.passwordInput.set('');
      this.resetCode = '';
      this.resetNewPassword = '';
      this.resetConfirmPassword = '';
      this.ongoingNonStudentLogin.set(true);
    } else {
      this.resetError.set('Ungültiger oder abgelaufener Code. Bitte erneut versuchen.');
    }
  }

  async downloadOrder(order: Order) {
    this.orderOfWichTheTicketsAreBeingDownloaded.set(order.id);
    await this.orderService.downloadOrder(order.id);
    this.orderOfWichTheTicketsAreBeingDownloaded.set(undefined);
  }

  async downloadTicket(orderId: string, ticketNumber: number) {
    this.ticketBeingDownloaded.set(`${orderId}-${ticketNumber - 1}`);
    try {
      await this.orderService.downloadTicket(orderId, ticketNumber);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    } finally {
      this.ticketBeingDownloaded.set(undefined);
    }
  }

  toggleTicketsDropdown(orderId: string) {
    const currentDropdowns = new Set(this.openTicketsDropdowns());
    if (currentDropdowns.has(orderId)) {
      currentDropdowns.delete(orderId);
    } else {
      currentDropdowns.add(orderId);
    }
    this.openTicketsDropdowns.set(currentDropdowns);
  }

  isTicketsDropdownOpen(orderId: string): boolean {
    return this.openTicketsDropdowns().has(orderId);
  }

  hasDigitalTickets(tickets: any[]): boolean {
    return tickets.some(ticket => !ticket.isPhysical);
  }

  getDigitalTicketsCount(tickets: any[]): number {
    return tickets.filter(ticket => !ticket.isPhysical).length;
  }

  async downloadAllTickets(orderId: string, tickets: any[]) {
    this.allTicketsBeingDownloaded.set(orderId);
    try {
      // Get all digital tickets with their indices
      const digitalTickets = tickets
        .map((ticket, index) => ({ ticket, index: index + 1 }))
        .filter(({ ticket }) => !ticket.isPhysical);

      // Download tickets sequentially one by one
      for (const { index } of digitalTickets) {
        try {
          await this.orderService.downloadTicket(orderId, index);
          // Add a small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error downloading ticket ${index}:`, error);
          // Continue with next ticket even if one fails
        }
      }
    } catch (error) {
      console.error('Error downloading all tickets:', error);
    } finally {
      this.allTicketsBeingDownloaded.set(undefined);
    }
  }

  async downloadBill(orderId: string) {
    this.billBeingDownloaded.set(orderId);
    try {
      await this.orderService.downloadBill(orderId);
    } catch (error) {
      console.error('Error downloading bill:', error);
    } finally {
      this.billBeingDownloaded.set(undefined);
    }
  }

  private async setTotalAmountOfOrder(order: Order) {
    const physicalTicketAdditionalCharge =
      await this.ticketsService.getPhysicalTicketAdditionalCharge();

    const orderPrice = order.order.tickets
      .map((t) => t.price + (t.isPhysical ? physicalTicketAdditionalCharge : 0))
      .reduce((a, b) => a + b, 0);

    this.ordersTotalAmounts.set(order, formatPrice(orderPrice));
  }
}
