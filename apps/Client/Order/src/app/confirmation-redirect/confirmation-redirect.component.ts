import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../confirmation.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-confirmation-redirect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-redirect.component.html',
  styleUrls: ['./confirmation-redirect.component.css']
})
export class ConfirmationRedirectComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationService = inject(ConfirmationService);
  error = signal<boolean>(false);
  alreadyConfirmed = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  async ngOnInit() {
    try {
      const id = this.route.snapshot.queryParams['id'];
      
      if (!id) {
        console.error('No order ID provided');
        this.error.set(true);
        return;
      }

      const result = await this.confirmationService.confirmOrder(id);

      this.isLoading.set(false);

      if (result.alreadyConfirmed) {
        this.alreadyConfirmed.set(true);
      } else if (!result.success) {
        this.error.set(true);
      }
    } catch (err) {
      console.error('Error confirming order:', err);
      this.error.set(true);
    }
  }

  goToHome() {
    window.location.href = environment.WELCOME_URL;
  }
}
