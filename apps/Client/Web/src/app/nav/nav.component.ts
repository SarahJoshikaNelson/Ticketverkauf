import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from '../dialog.service';
import { PhaseService } from '../phase.service';
import { InfoDialogComponent } from '../info-dialog/info-dialog.component';
import { KeycloakService } from 'keycloak-angular';
import { environment } from '../../environments/environment';
import { DataProviderService } from '../data-provider.service';
import { DatePipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    ButtonComponent,
    DatePipe,
    CommonModule,
    RouterLink
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent implements OnInit {
  homepage: string = "https://www.htl-leonding.at/";

  readonly dialogService = inject(DialogService);

  date = signal<Date>(new Date());
  loader = signal<boolean>(false);

  constructor(private phaseService: PhaseService, private keycloakService: KeycloakService, private dataProvider : DataProviderService) { }

  async ngOnInit(): Promise<void> {
    this.date.set(this.dataProvider.getDateLocal() || new Date());

    await this.saveDatas();
  }

  async saveDatas() {
    this.date.set(await this.dataProvider.getDate());
    this.dataProvider.saveDateLocal(this.date().toISOString());
  }

  @Input()
  color: string = 'violet';

  readonly dialog = inject(MatDialog);

  async openDialog() {
    if (await this.phaseService.isAllowed()) {
    }
    else if (!this.keycloakService.isLoggedIn()) {
      this.dialogService.openDialog(InfoDialogComponent, '50vh', '70vw', true, false, { 'info': 'Sie können aktuell nur als Maturant buchen', 'desc': 'Sie sind Maturant aber können sich trotzdem nicht einlogen? Wenden Sie sich an maturaballkomitee@htl-leonding.ac.at!', 'picture': true, 'button': true });
    }
    else {
      this.dialogService.openDialog(InfoDialogComponent, '50vh', '70vw', true, false, { 'info': 'Sie können aktuell keine Reservierung buchen', 'desc': 'Falls Sie sich sicher sind, dass Sie die Berechtigung haben sollten, wenden Sie sich bitte an das Maturaball-Team (maturaballkomitee@htl-leonding.ac.at)', 'picture': true, 'button': false });
    }
  }

  async navigateToOrderPage() {
    if (await this.phaseService.isAllowed()) {
      window.location.href = environment.ORDER_URL + '/';
    }
    else if (!this.keycloakService.isLoggedIn()) {
      this.dialogService.openDialog(InfoDialogComponent, '50vh', '70vw', true, false, { 'info': 'Sie können aktuell nur als Maturant buchen', 'desc': 'Sie sind Maturant aber können sich trotzdem nicht einlogen? Wenden Sie sich an maturaballkomitee@htl-leonding.ac.at!', 'picture': true, 'button': true });
    }
    else {
      this.dialogService.openDialog(InfoDialogComponent, '50vh', '70vw', true, false, { 'info': 'Sie können aktuell keine Reservierung buchen', 'desc': 'Falls Sie sich sicher sind, dass Sie die Berechtigung haben sollten, wenden Sie sich bitte an das Maturaball-Team (maturaballkomitee@htl-leonding.ac.at)', 'picture': true, 'button': false });
    }
  }

  navigateToShopPage() {
    window.location.href = environment.SHOP_URL + '/';
  }
}