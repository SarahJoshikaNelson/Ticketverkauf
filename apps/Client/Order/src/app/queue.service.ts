import { Injectable, signal, computed, OnDestroy, inject } from '@angular/core';
import { WaitingListSummary } from '@ticket-system/models';
import { environment } from '../environments/environment';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface QueueState {
  position: number;
  totalWaiting: number;
  sessionId: string;
  isNew: boolean;
}

export interface TimerState {
  remainingSeconds: number;
  totalDurationSeconds: number;
  formattedTime: string;
  isExpired: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class QueueService implements OnDestroy {
  // WebSocket connection
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 500; // Start fast
  private maxReconnectDelay = 5000; // Cap at 5s
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Timer
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private sessionStartTime: Date | null = null;
  
  // Active reservation refresh - keeps the backend reservation alive
  private activeRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly activeRefreshIntervalMs = 10000; // Every 10 seconds
  
  // Visibility change handling - reconnect when page becomes visible
  private visibilityChangeHandler: (() => void) | null = null;
  
  // Signals for reactive state
  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly _queueState = signal<QueueState>({
    position: 0,
    totalWaiting: 0,
    sessionId: '',
    isNew: false
  });
  private readonly _timerState = signal<TimerState>({
    remainingSeconds: 0,
    totalDurationSeconds: 0,
    formattedTime: '00:00',
    isExpired: false,
    urgencyLevel: 'low'
  });
  private readonly _duration = signal<number>(0);
  private readonly _isInQueue = signal<boolean>(false);
  private readonly _canProceed = signal<boolean>(false);
  
  // Public readonly signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly queueState = this._queueState.asReadonly();
  readonly timerState = this._timerState.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly isInQueue = this._isInQueue.asReadonly();
  readonly canProceed = this._canProceed.asReadonly();
  
  // Computed values
  readonly isConnected = computed(() => this._connectionStatus() === 'connected');
  readonly isNextInLine = computed(() => this._queueState().position === 0);
  readonly pulseDuration = computed(() => this.calculatePulseDuration());
  
  constructor() {
    this.initializeFromStorage();
    this.setupVisibilityChangeHandler();
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  /**
   * Initialize service state from localStorage
   */
  private initializeFromStorage(): void {
    const storedTimestamp = localStorage.getItem('timeStamp');
    if (storedTimestamp) {
      this.sessionStartTime = new Date(storedTimestamp);
    }
  }
  
  /**
   * Setup handler for page visibility changes.
   * When the page becomes visible again, refresh the active reservation
   * to prevent losing the spot due to backend timeout.
   */
  private setupVisibilityChangeHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing active reservation...');
        this.onPageBecameVisible();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  /**
   * Handle page becoming visible - refresh reservation and reconnect if needed
   */
  private async onPageBecameVisible(): Promise<void> {
    // Immediately check if we still have an active reservation
    const sessionId = this.getSessionCookie();
    if (sessionId) {
      const canPass = await this.checkCanProceed(sessionId);
      console.log('Visibility check - can pass:', canPass);
      
      if (!canPass) {
        // Lost our reservation, may need to go back to waiting list
        console.warn('Lost active reservation while page was hidden');
      }
    }
    
    // Ensure WebSocket is still connected
    if (this._isInQueue() && this.socket?.readyState !== WebSocket.OPEN) {
      console.log('WebSocket disconnected while page was hidden, reconnecting...');
      this.connect().catch(console.error);
    }
  }
  
  /**
   * Get session cookie value
   */
  getSessionCookie(): string | undefined {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('__session='))
      ?.split('=')[1];
  }
  
  /**
   * Set session cookie with proper security flags
   */
  setSessionCookie(sessionId: string): void {
    const isSecure = window.location.protocol === 'https:';
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const domain = parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : '';
    const domainAttr = domain ? `; domain=${domain}` : '';
    const sameSiteAttr = isSecure ? 'SameSite=None; Secure' : 'SameSite=Lax';
    const cookieString = `__session=${sessionId}; path=/; ${sameSiteAttr}${domainAttr}`;
    document.cookie = cookieString;
  }
  
  /**
   * Fetch session duration from server
   */
  async fetchDuration(): Promise<number> {
    try {
      const res = await fetch(`${environment.API_URL}/v2/waiting/duration`);
      if (!res.ok) throw new Error('Failed to fetch duration');
      const duration = await res.json();
      this._duration.set(duration);
      return duration;
    } catch (error) {
      console.error('Error fetching duration:', error);
      return 0;
    }
  }
  
  /**
   * Check if current session can proceed past the queue
   * Returns true on network errors to prevent blocking users who already passed
   */
  async checkCanProceed(sessionId?: string): Promise<boolean> {
    const id = sessionId || this.getSessionCookie();
    if (!id) return false;
    
    try {
      const response = await fetch(`${environment.API_URL}/v2/waiting/${id}/pass`);
      const canPass = response.status === 200;
      this._canProceed.set(canPass);
      return canPass;
    } catch (error) {
      console.error('Error checking pass status:', error);
      // On network error, allow access to prevent blocking users who already passed
      // The active reservation refresh will handle re-establishing the connection
      return true;
    }
  }
  
  /**
   * Get current position in queue
   */
  async fetchQueuePosition(sessionId?: string): Promise<number> {
    const id = sessionId || this.getSessionCookie();
    if (!id) return -1;
    
    try {
      const response = await fetch(`${environment.API_URL}/v2/waiting/${id}`);
      if (!response.ok) return -1;
      return parseInt(await response.text());
    } catch (error) {
      console.error('Error fetching queue position:', error);
      return -1;
    }
  }
  
  /**
   * Connect to WebSocket for real-time queue updates
   */
  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this._connectionStatus.set('connecting');
    this.reconnectAttempts = 0;
    
    return this.createConnection();
  }
  
  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`${environment.WEBSOCKET_URL}/v2/waiting`);
        
        this.socket.onopen = () => {
          console.log('Queue WebSocket connected');
          this._connectionStatus.set('connected');
          this.reconnectAttempts = 0;
          this._isInQueue.set(true);
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
        
        this.socket.onerror = (event) => {
          console.error('Queue WebSocket error:', event);
          this._connectionStatus.set('error');
        };
        
        this.socket.onclose = (event) => {
          console.log('Queue WebSocket closed:', event.code, event.reason);
          this._connectionStatus.set('disconnected');
          this.attemptReconnect();
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this._connectionStatus.set('error');
        reject(error);
      }
    });
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WaitingListSummary;
      console.log('Queue update received:', message);
      
      // Handle new session assignment
      const currentSessionId = this.getSessionCookie();
      if ((!currentSessionId || this._queueState().position === -1) && message.isNew) {
        this.setSessionCookie(message.sessionId);
      }
      
      // Update queue state
      this._queueState.set({
        position: message.inFrontOfSessionHolder,
        totalWaiting: message.currentlyWaiting,
        sessionId: message.sessionId,
        isNew: message.isNew ?? false
      });
      
      // Check if user can proceed
      if (message.inFrontOfSessionHolder === 0) {
        this.checkCanProceed();
      }
      
    } catch (error) {
      console.error('Error parsing queue message:', error);
    }
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this._connectionStatus.set('error');
      return;
    }
    
    this.reconnectAttempts++;
    // Aggressive backoff: start at 500ms, multiply by 1.5, cap at 5s
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    
    console.log(`Queue reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this._connectionStatus.set('connecting');
      this.createConnection().catch(() => {
        // Reconnection failed, will retry automatically
      });
    }, delay);
  }
  
  /**
   * Start periodic refresh of active reservation status.
   * This keeps calling mayPass to maintain the reservation.
   */
  startActiveReservationRefresh(): void {
    this.stopActiveReservationRefresh();
    
    // Immediately check once
    this.refreshActiveReservation();
    
    // Then check periodically
    this.activeRefreshInterval = setInterval(() => {
      this.refreshActiveReservation();
    }, this.activeRefreshIntervalMs);
    
    console.log(`Started active reservation refresh every ${this.activeRefreshIntervalMs}ms`);
  }
  
  /**
   * Stop the active reservation refresh interval
   */
  stopActiveReservationRefresh(): void {
    if (this.activeRefreshInterval) {
      clearInterval(this.activeRefreshInterval);
      this.activeRefreshInterval = null;
    }
  }
  
  /**
   * Refresh active reservation by calling mayPass
   */
  private async refreshActiveReservation(): Promise<void> {
    const sessionId = this.getSessionCookie();
    if (!sessionId) return;
    
    try {
      const canPass = await this.checkCanProceed(sessionId);
      if (!canPass) {
        console.warn('Active reservation refresh: lost reservation');
        // Stop refreshing if we lost our spot
        this.stopActiveReservationRefresh();
      }
    } catch (error) {
      console.error('Error refreshing active reservation:', error);
    }
  }
  
  /**
   * Initialize and start the session timer
   */
  async initializeTimer(): Promise<void> {
    // Fetch duration if not already set
    if (this._duration() === 0) {
      await this.fetchDuration();
    }
    
    const duration = this._duration();
    if (duration === 0) return;
    
    // Set session start time if not already set
    if (!this.sessionStartTime) {
      this.sessionStartTime = new Date();
      localStorage.setItem('timeStamp', this.sessionStartTime.toISOString());
    }
    
    const totalDurationSeconds = duration * 60;
    
    // Start timer update interval
    this.startTimerInterval(totalDurationSeconds);
  }
  
  private startTimerInterval(totalDurationSeconds: number): void {
    // Clear existing interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    const updateTimer = () => {
      if (!this.sessionStartTime) return;
      
      const endTime = new Date(this.sessionStartTime.getTime() + totalDurationSeconds * 1000);
      const now = new Date();
      const remainingMs = endTime.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const isExpired = remainingSeconds <= 0;
      const urgencyLevel = this.calculateUrgencyLevel(remainingSeconds, totalDurationSeconds);
      
      this._timerState.set({
        remainingSeconds,
        totalDurationSeconds,
        formattedTime,
        isExpired,
        urgencyLevel
      });
      
      // Handle expiration
      if (isExpired && this._duration() > 0) {
        this.handleSessionExpired();
      }
    };
    
    // Update immediately and then every second
    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }
  
  private calculateUrgencyLevel(remaining: number, total: number): 'low' | 'medium' | 'high' | 'critical' {
    if (total === 0) return 'low';
    const percentage = (remaining / total) * 100;
    
    if (percentage > 50) return 'low';
    if (percentage > 25) return 'medium';
    if (percentage > 10) return 'high';
    return 'critical';
  }
  
  private calculatePulseDuration(): number {
    const state = this._timerState();
    if (state.totalDurationSeconds === 0) return 2;
    
    const percentageRemaining = (state.remainingSeconds / state.totalDurationSeconds) * 100;
    
    if (percentageRemaining > 75) return 3;
    if (percentageRemaining > 50) return 2;
    if (percentageRemaining > 25) return 1.5;
    if (percentageRemaining > 10) return 1;
    if (percentageRemaining > 5) return 0.7;
    return 0.4;
  }
  
  private handleSessionExpired(): void {
    console.log('Session expired');
    this.clearSession();
    
    // Notify server about expiration
    const sessionId = this.getSessionCookie();
    if (sessionId) {
      fetch(`${environment.API_URL}/v2/waiting/${sessionId}/pass`).catch(() => {});
    }
    
    // Redirect to welcome page
    window.location.href = environment.WELCOME_URL + '/';
  }
  
  /**
   * Clear all session data
   */
  clearSession(): void {
    localStorage.clear();
    // Also clear the queue pass state from sessionStorage
    sessionStorage.removeItem('__queue_passed');
    this.sessionStartTime = null;
    this._timerState.set({
      remainingSeconds: 0,
      totalDurationSeconds: 0,
      formattedTime: '00:00',
      isExpired: true,
      urgencyLevel: 'low'
    });
  }
  
  /**
   * Disconnect from WebSocket and clean up
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this._connectionStatus.set('disconnected');
    this._isInQueue.set(false);
  }
  
  /**
   * Full cleanup of all resources
   */
  cleanup(): void {
    this.disconnect();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.stopActiveReservationRefresh();
    
    // Remove visibility change handler
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }
  
  /**
   * Force refresh queue state from server
   */
  async refreshQueueState(): Promise<void> {
    const sessionId = this.getSessionCookie();
    if (!sessionId) return;
    
    const [position, canProceed] = await Promise.all([
      this.fetchQueuePosition(sessionId),
      this.checkCanProceed(sessionId)
    ]);
    
    this._queueState.update(state => ({
      ...state,
      position
    }));
    this._canProceed.set(canProceed);
  }
}

