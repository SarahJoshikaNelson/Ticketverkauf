import { Component } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-checkout-cancel',
  imports: [],
  templateUrl: './checkout-cancel.component.html',
  styleUrl: './checkout-cancel.component.css'
})
export class CheckoutCancelComponent {
  goToHome() {
    window.location.href = environment.WELCOME_URL;
  }
}
