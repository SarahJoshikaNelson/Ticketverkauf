import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-datenschutz',
  standalone: true,
  imports: [],
  templateUrl: './datenschutz.component.html',
  styleUrl: './datenschutz.component.css'
})
export class DatenschutzComponent {
  constructor(private router: Router) { }

  goToHome() {
    this.router.navigate(['/']);
  }
}
