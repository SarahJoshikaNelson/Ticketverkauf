import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PhaseService } from './phase.service';
import { QueueService } from './queue.service';
import { environment } from '../environments/environment';
import { isE2EMode } from './e2e-mode';

@Injectable({
  providedIn: 'root'
})
export class MiddlewareGuard implements CanActivate {
  private readonly phaseService = inject(PhaseService);
  private readonly queueService = inject(QueueService);
  private readonly router = inject(Router);

  // Cache the pass check to avoid excessive API calls
  private lastPassCheckTime = 0;
  private lastPassCheckResult = false;
  private readonly passCheckCacheDuration = 30000; // 30 seconds cache

  // Storage key for persisting pass state across page reloads (e.g., Keycloak login/logout)
  private readonly PASS_STATE_KEY = '__queue_passed';

  // Track if user has ever successfully passed the queue in this session
  private _hasEverPassed = false;

  // Getter that checks sessionStorage first (survives page reloads)
  private get hasEverPassed(): boolean {
    if (this._hasEverPassed) return true;
    // Check sessionStorage for persisted state (survives Keycloak redirects)
    const stored = sessionStorage.getItem(this.PASS_STATE_KEY);
    if (stored === 'true') {
      this._hasEverPassed = true;
      return true;
    }
    return false;
  }

  // Setter that also persists to sessionStorage
  private set hasEverPassed(value: boolean) {
    this._hasEverPassed = value;
    if (value) {
      sessionStorage.setItem(this.PASS_STATE_KEY, 'true');
    } else {
      sessionStorage.removeItem(this.PASS_STATE_KEY);
    }
  }

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    // E2E should exercise canonical routes without queue/phase side effects.
    if (isE2EMode()) {
      return true;
    }

    const targetUrl = state.url;
    console.log('MiddlewareGuard: checking route', targetUrl);

    try {
      // Small delay to ensure services are initialized
      await this.delay(50);

      // Check if ordering is allowed in current phase
      const isAllowed = await this.checkPhaseAllowed();
      if (!isAllowed) {
        console.log('MiddlewareGuard: phase not allowed, redirecting to welcome');
        return this.redirectToWelcome();
      }

      // If accessing waiting-list route, always allow
      // Use the TARGET URL from RouterStateSnapshot, not window.location
      if (this.isWaitingListRoute(targetUrl)) {
        console.log('MiddlewareGuard: allowing waiting-list route');
        return true;
      }

      // If user has ever passed the queue in this session, allow navigation
      if (this.hasEverPassed) {
        console.log('MiddlewareGuard: user has passed before, allowing with background refresh');
        this.backgroundRefreshPass();
        return true;
      }

      // Check if user can pass the queue
      console.log('MiddlewareGuard: checking if user can pass queue...');
      const canPass = await this.checkCanPass();
      console.log('MiddlewareGuard: canPass result:', canPass);

      if (!canPass) {
        console.log('MiddlewareGuard: cannot pass, redirecting to waiting-list');
        return this.redirectToWaitingList();
      }

      // Mark that user has passed
      this.hasEverPassed = true;
      console.log('MiddlewareGuard: user passed, allowing access');
      return true;
    } catch (error) {
      console.error('Error in MiddlewareGuard:', error);
      // Allow access on errors to prevent blocking users completely
      return true;
    }
  }

  /**
   * Check if ordering is allowed in current phase
   */
  private async checkPhaseAllowed(): Promise<boolean> {
    try {
      return await this.phaseService.isAllowed();
    } catch (error) {
      console.error('Error checking phase:', error);
      return true; // Default to allowing on error
    }
  }

  /**
   * Check if user can pass the queue with caching
   */
  private async checkCanPass(): Promise<boolean> {
    const now = Date.now();

    // Return cached result if still valid AND the result was positive
    if (now - this.lastPassCheckTime < this.passCheckCacheDuration && this.lastPassCheckResult) {
      console.log('MiddlewareGuard: using cached pass result:', this.lastPassCheckResult);
      return this.lastPassCheckResult;
    }

    try {
      const sessionId = this.queueService.getSessionCookie();
      console.log('MiddlewareGuard: session cookie:', sessionId ? 'exists' : 'missing');

      if (!sessionId) {
        // No session cookie - need to go through waiting list
        this.lastPassCheckResult = false;
        this.lastPassCheckTime = now;
        return false;
      }

      const canPass = await this.queueService.checkCanProceed(sessionId);
      console.log('MiddlewareGuard: API check result:', canPass);

      this.lastPassCheckResult = canPass;
      this.lastPassCheckTime = now;

      if (canPass) {
        this.hasEverPassed = true;
      }

      return canPass;
    } catch (error) {
      console.error('Error checking pass status:', error);
      // On error, allow access to prevent blocking
      return true;
    }
  }

  /**
   * Refresh pass status in background without blocking navigation
   */
  private backgroundRefreshPass(): void {
    const sessionId = this.queueService.getSessionCookie();
    if (!sessionId) return;

    this.queueService.checkCanProceed(sessionId).then(canPass => {
      if (!canPass) {
        console.warn('Background pass check failed - user may have lost reservation');
        this.hasEverPassed = false;
        this.lastPassCheckResult = false;
      } else {
        this.lastPassCheckTime = Date.now();
        this.lastPassCheckResult = true;
      }
    }).catch(() => {
      // Ignore background refresh errors
    });
  }

  /**
   * Check if target route is the waiting list
   * Uses the target URL from navigation, not window.location
   */
  private isWaitingListRoute(targetUrl: string): boolean {
    return targetUrl.includes('waiting-list');
  }

  /**
   * Redirect to welcome page
   */
  private redirectToWelcome(): false {
    try {
      window.location.href = environment.WELCOME_URL + '/';
    } catch (error) {
      console.error('Redirect to welcome failed:', error);
      this.router.navigate(['/']);
    }
    return false;
  }

  /**
   * Redirect to waiting list using Angular router
   */
  private redirectToWaitingList(): UrlTree {
    return this.router.createUrlTree(['/waiting-list']);
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the pass check cache and reset state
   */
  clearCache(): void {
    this.lastPassCheckTime = 0;
    this.lastPassCheckResult = false;
    this._hasEverPassed = false;
    sessionStorage.removeItem(this.PASS_STATE_KEY);
  }

  /**
   * Reset the "has ever passed" flag
   */
  resetPassedState(): void {
    this._hasEverPassed = false;
    sessionStorage.removeItem(this.PASS_STATE_KEY);
  }
}
