import { Routes } from '@angular/router';
import { TicketSelectionComponent } from './ticket-selection/ticket-selection.component';
import { PersonalDataComponent } from './personal-data/personal-data.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';
import { OrderConfirmationComponent } from './order-confirmation/order-confirmation.component';
import { ConfirmationRedirectComponent } from './confirmation-redirect/confirmation-redirect.component';
import { MiddlewareGuard } from './middleware.guard';
import { WaitingListComponent } from './waiting-list/waiting-list.component';
import { TicketsDownloadComponent } from './tickets-download/tickets-download.component';
import { OrdersListComponent } from './orders-list/orders-list.component';
import { CheckoutSuccessComponent } from './checkout-success/checkout-success.component';
import { CheckoutCancelComponent } from './checkout-cancel/checkout-cancel.component';

export const routes: Routes = [
  {
    path: 'download/:id',
    component: TicketsDownloadComponent,
  },
  {
    path: 'checkout/success',
    component: CheckoutSuccessComponent,
  },
  {
    path: 'checkout/cancel',
    component: CheckoutCancelComponent,
  },
  {
    path: '',
    component: TicketSelectionComponent,
    canActivate: [MiddlewareGuard],
    pathMatch: 'full',
  },
  {
    path: 'personal-data',
    component: PersonalDataComponent,
    canActivate: [MiddlewareGuard],
  },
  {
    path: 'summary',
    component: OrderSummaryComponent,
    canActivate: [MiddlewareGuard],
  },
  { path: 'confirmation', component: OrderConfirmationComponent },
  { path: 'confirmation-redirect', component: ConfirmationRedirectComponent },
  {
    path: 'waiting-list',
    component: WaitingListComponent,
    canActivate: [MiddlewareGuard],
  },
  {
    path: 'orders',
    component: OrdersListComponent,
  },

  // Handle Keycloak redirect URIs - redirect to home instead of waiting-list
  { path: 'ticket', redirectTo: '', pathMatch: 'full' },
  { path: 'tickets', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
