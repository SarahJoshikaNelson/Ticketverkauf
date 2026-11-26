import {Component, inject, Input, OnInit, signal} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { DialogService } from '../dialog.service';
import { PhaseService } from '../phase.service';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { InfoDialogComponent } from '../info-dialog/info-dialog.component';
import { KeycloakService } from 'keycloak-angular';
import { environment } from '../../environments/environment';
import { DataProviderService } from '../data-provider.service';
import { firstValueFrom } from 'rxjs';
import {Router} from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    ButtonComponent
  ],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit {
  constructor(private phaseService: PhaseService, private keycloakService: KeycloakService, private dataProviderService: DataProviderService, private router: Router, private authService: AuthService) { }
  showOrdersList = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isLoggedIn = signal<boolean>(false);

  @Input()
  color: string = 'violet';

  @Input()
  accentColor: string = 'yellow';

  @Input()
  title: string = '';
  @Input()
  subtitle: string = '';

  readonly dialogService = inject(DialogService);

  async ngOnInit() {
    this.showOrdersList.set(await this.phaseService.isAllowed())
    this.checkIfLoggedIn();
  }

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

  async checkIfLoggedIn() {
    this.isLoading.set(true);
    this.isLoading.set(false);
    this.isLoggedIn.set(await this.authService.isLoggedIn());
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

  async navigateToOrderListPage() {
    await this.router.navigate(['/orders']);
  }
}
