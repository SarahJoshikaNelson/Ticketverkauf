import {Component, inject, OnInit, signal} from '@angular/core';
import {KeycloakService} from 'keycloak-angular';
import {OrderService} from '../order.service';
import {Customer, Order} from '@ticket-system/models';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LoginToken} from '@ticket-system/models/order';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.css'
})
export class OrdersListComponent implements OnInit {
  private keycloakService = inject(KeycloakService);
  private orderService = inject(OrderService);
  orders = signal<Order[] | null>(null)
  ongoingNonStudentLogin = signal<boolean>(false);
  emailInput = signal<string>('');
  passwordInput = signal<string>('');
  loginError = signal<string | null>(null);

  // Password reset flow
  resetMode = signal<'none' | 'enter-email' | 'enter-code'>("none");
  // Plain properties for [(ngModel)] two-way binding (signals don't work with ngModel)
  resetEmail = '';
  resetCode = '';
  resetNewPassword = '';
  resetConfirmPassword = '';
  resetError = signal<string | null>(null);
  resetSuccess = signal<boolean>(false);
  resetLoading = signal<boolean>(false);

  async getOrders(): Promise<Order[] | null> {
    if (!this.keycloakService.isLoggedIn() && sessionStorage.getItem("non-student-auth-token") == null) {
      return null;
    }
    try {
      if (this.keycloakService.isLoggedIn()) {
        await this.keycloakService.getKeycloakInstance().loadUserProfile();
        return await this.orderService.fetchOrders(this.keycloakService.getKeycloakInstance().profile!.email!, null);
      }
      const email = this.emailInput() || localStorage.getItem('non-student-email') || null;
      return await this.orderService.fetchOrders(email, sessionStorage.getItem("non-student-auth-token"));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return null;
    }
  }

  async ngOnInit() {
    this.orders.set(await this.getOrders());
  }

  studentLogin() {
    this.keycloakService.login({
      redirectUri: window.location.origin + '/orders'
    });
  }

  nonStudentLogin() {
    this.ongoingNonStudentLogin.set(true);
    this.loginError.set(null);
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
      town: ''
    }
    try {
      let token: LoginToken | null;
      try {
        token = await this.orderService.login(customer);
      } catch (error: any) {
        this.loginError.set('Ungültige E-Mail-Adresse oder Passwort. Bitte versuchen Sie es erneut.');
        return;
      }
      sessionStorage.setItem("non-student-auth-token", token.token);
      localStorage.setItem('non-student-email', customer.mailAddress);
      this.loginError.set(null);
    } catch (error) {
      this.loginError.set('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
    this.ongoingNonStudentLogin.set(false);
    this.orders.set(await this.getOrders());
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
}
