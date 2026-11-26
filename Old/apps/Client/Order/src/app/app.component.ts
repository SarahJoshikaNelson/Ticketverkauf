import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { StyleService } from './style.service';
import { QueueService } from './queue.service';
import { ActiveReservationService } from './active-reservation.service';
import { isE2EMode } from './e2e-mode';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly styleService = inject(StyleService);
  private readonly queueService = inject(QueueService);
  private readonly activeReservationService = inject(ActiveReservationService);
  private readonly destroy$ = new Subject<void>();

  // Step tracking
  readonly currentStep = signal(1);

  // Page state flags
  readonly isWaitingList = signal(false);
  readonly isConfirmationRedirect = signal(false);
  readonly isConfirmation = signal(false);
  readonly isDownloadPage = signal(false);
  readonly isCheckoutSuccess = signal(false);
  readonly isCheckoutCancel = signal(false);
  // Timer state from QueueService
  readonly timerState = this.queueService.timerState;
  readonly duration = this.queueService.duration;

  // Computed values for template
  readonly timeDifference = computed(() => this.timerState().formattedTime);
  readonly remainingTimeInSeconds = computed(
    () => this.timerState().remainingSeconds
  );

  // Timer visibility
  readonly showTimer = computed(
    () =>
      !this.isWaitingList() &&
      this.duration() > 0 &&
      !this.isConfirmationRedirect() &&
      !this.isConfirmation() &&
      !this.isDownloadPage() &&
      !this.isCheckoutSuccess() &&
      !this.isCheckoutCancel()
  );

  // Pulse duration based on urgency
  readonly pulseDuration = computed(() => {
    const state = this.timerState();
    if (state.totalDurationSeconds === 0) return 2;

    switch (state.urgencyLevel) {
      case 'low':
        return 3;
      case 'medium':
        return 2;
      case 'high':
        return 1;
      case 'critical':
        return 0.5;
      default:
        return 2;
    }
  });

  // Timer bar color based on urgency
  readonly timerBarClass = computed(() => {
    const urgency = this.timerState().urgencyLevel;
    switch (urgency) {
      default:
        return 'bg-primary';
    }
  });

  ngOnInit(): void {
    this.initializeApp();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.queueService.cleanup();
    this.activeReservationService.close();
  }

  private async initializeApp(): Promise<void> {
    if (isE2EMode()) {
      (window as Window & {
        __e2eNavigate?: (url: string) => Promise<boolean>;
        __e2eRoutes?: string[];
      }).__e2eNavigate = (url: string) => this.router.navigateByUrl(url);

      (window as Window & { __e2eRoutes?: string[] }).__e2eRoutes =
        this.router.config.map((route) => route.path || '');
    }

    // Track route changes
    this.trackRouteChanges();

    // Check initial URL state
    this.updatePageStateFromUrl(this.router.url);

    // Initialize timer if not on waiting list
    if (!window.location.href.includes('waiting-list')) {
      await this.initializeSessionTimer();
    }

    // Load and apply styles
    await this.initializeStyles();

    // Connect to active reservation updates
    this.connectActiveReservations();
  }

  private trackRouteChanges(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateStepFromUrl(event.url);
        this.updatePageStateFromUrl(event.url);
      });

    // Set initial step based on current URL
    this.updateStepFromUrl(this.router.url);
  }

  private updatePageStateFromUrl(url: string): void {
    this.isWaitingList.set(url.includes('waiting-list'));
    this.isConfirmationRedirect.set(url.includes('confirmation-redirect'));
    this.isConfirmation.set(
      url.includes('confirmation') && !url.includes('confirmation-redirect')
    );
    this.isDownloadPage.set(url.includes('download'));
  }

  private updateStepFromUrl(url: string): void {
    // Reset flags
    this.isConfirmation.set(false);
    this.isConfirmationRedirect.set(false);
    this.isWaitingList.set(false);
    this.isDownloadPage.set(false);
    this.isCheckoutSuccess.set(false);
    this.isCheckoutCancel.set(false);

    // Steps: 1=Warteschlange, 2=Auswahl, 3=Daten, 4=Übersicht, 5=Bestätigung
    if (url.includes('waiting-list')) {
      this.currentStep.set(1);
      this.isWaitingList.set(true);
    } else if (url.includes('confirmation-redirect')) {
      this.currentStep.set(5);
      this.isConfirmationRedirect.set(true);
    } else if (url.includes('confirmation')) {
      this.currentStep.set(5);
      this.isConfirmation.set(true);
    } else if (url.includes('summary')) {
      this.currentStep.set(4);
    } else if (url.includes('checkout/success')) {
      this.currentStep.set(5);
      this.isCheckoutSuccess.set(true);
    } else if (url.includes('checkout/cancel')) {
      this.currentStep.set(5);
      this.isCheckoutCancel.set(true);
    } else if (url.includes('personal-data')) {
      this.currentStep.set(3);
    } else if (url === '/' || url === '') {
      this.currentStep.set(2);
    } else {
      this.currentStep.set(2);
    }
  }

  private async initializeSessionTimer(): Promise<void> {
    // Store timestamp if this is a new session
    if (!localStorage.getItem('timeStamp')) {
      localStorage.setItem('timeStamp', new Date().toISOString());
    }

    // Initialize timer through queue service
    await this.queueService.initializeTimer();

    // Start active reservation refresh to keep the backend reservation alive
    // This is critical - backend removes users after 15 seconds of inactivity
    this.queueService.startActiveReservationRefresh();
  }

  private async initializeStyles(): Promise<void> {
    try {
      const styles = await this.styleService.getStyles();
      this.styleService.applyStyles(styles);
      console.log('Styles initialized:', styles);
    } catch (error) {
      console.error('Failed to initialize styles:', error);
    }
  }

  private connectActiveReservations(): void {
    // Only connect to active reservation WebSocket if not on waiting list
    // This keeps the backend reservation alive while user is ordering
    if (!window.location.href.includes('waiting-list')) {
      this.activeReservationService
        .connect((message) => {
          console.log('Active reservation message:', message);
        })
        .catch((error) => {
          console.error(
            'Failed to connect to active reservation WebSocket:',
            error
          );
        });
    }
  }

  /**
   * Get pulse animation duration for timer bar
   * Deprecated: Use pulseDuration() computed signal instead
   */
  getPulseDuration(): number {
    return this.pulseDuration();
  }
}
