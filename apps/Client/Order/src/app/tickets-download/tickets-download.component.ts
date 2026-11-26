import { Component, inject, input, OnInit } from '@angular/core';
import { SpinnerComponent } from '../comps/spinner/spinner.component';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tickets-download',
  imports: [SpinnerComponent],
  templateUrl: './tickets-download.component.html',
})
export class TicketsDownloadComponent implements OnInit {
  readonly id = input.required<string>();
  readonly router = inject(Router);

  ngOnInit() {
    window.location.href = `${environment.WELCOME_URL}/orders`;
  }
}
