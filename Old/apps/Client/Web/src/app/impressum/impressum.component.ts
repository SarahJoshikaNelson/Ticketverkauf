import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.css'
})
export class ImpressumComponent {
  constructor(private router: Router) { }

  goToHome() {
    this.router.navigate(['/']);
  }
}
