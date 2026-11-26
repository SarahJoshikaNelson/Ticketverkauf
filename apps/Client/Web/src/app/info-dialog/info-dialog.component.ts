import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ButtonComponent } from "../button/button.component";
import { KeycloakService } from 'keycloak-angular';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-info-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './info-dialog.component.html',
  styleUrl: './info-dialog.component.css'
})
export class InfoDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { info: string, desc: string, picture: boolean, button: boolean }, private keycloakService: KeycloakService, private router: Router) { }

  isLoggedIn() {
    return this.keycloakService.isLoggedIn();
  }

  async logIn() {
    await this.router.navigate([], { queryParams: { site: 2 } });
    this.keycloakService.login();
  }
}
