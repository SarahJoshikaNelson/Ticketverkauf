import { Component, inject, signal } from '@angular/core';
import { WaitingListWebSocketService } from '../waiting-list-web-socket.service';
import { OnInit } from '@angular/core';
import { WaitingListSummary } from '@ticket-system/models';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { StyleService } from '../style.service';

@Component({
  selector: 'app-waiting-list',
  imports: [],
  templateUrl: './waiting-list.component.html',
  styleUrl: './waiting-list.component.css',
})
export class WaitingListComponent implements OnInit {
  private waitingListWebSocketService = inject(WaitingListWebSocketService);
  private router = inject(Router);
  private styleService = inject(StyleService);
  public gifUrl = signal<string>('');
  public waitingList = signal<WaitingListSummary>({
    currentlyWaiting: 0,
    inFrontOfSessionHolder: 0,
    sessionId: '',
    isNew: false,
  });

  async ngOnInit() {
    this.gifUrl.set(await this.styleService.getGifUrl());
    await this.waitingListWebSocketService.connect(async (message) => {
      let currentSessionCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('__session='))
        ?.split('=')[1];

      console.log('Current session cookie', currentSessionCookie);

      console.log('Message is new', message.isNew);
      if (
        (!currentSessionCookie ||
          this.waitingList().inFrontOfSessionHolder == -1) &&
        message.isNew
      ) {
        console.log('Setting session cookie to', message.sessionId);
        currentSessionCookie = message.sessionId;
        // Set cookie with proper security flags for HTTPS and cross-subdomain support
        const isSecure = window.location.protocol === 'https:';
        // Extract parent domain (e.g., "ballkoenig.store" from "order.dev.ballkoenig.store")
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        // Use parent domain if we have at least 2 parts (e.g., ".ballkoenig.store")
        const domain = environment.COOKIE_DOMAIN;
        const domainAttr = `; domain=${domain}`;
        const sameSiteAttr = isSecure
          ? 'SameSite=None; Secure'
          : 'SameSite=Lax';
        const cookieString = `__session=${message.sessionId}; path=/; ${sameSiteAttr}${domainAttr}`;
        document.cookie = cookieString;
        console.log('Cookie set with flags:', cookieString);
        console.log('Hostname:', hostname, 'Domain:', domain);
      }

      if (currentSessionCookie) {
        const inFrontOfSessionHolder = await fetch(
          `${environment.API_URL}/v2/waiting/${currentSessionCookie}`
        );

        const mayPass = await fetch(
          `${environment.API_URL}/v2/waiting/${currentSessionCookie}/pass`
        );

        if (mayPass.status === 200) {
          window.location.href = '/';
        } else {
          localStorage.clear();
          // Also clear the queue pass state from sessionStorage
          sessionStorage.removeItem('__queue_passed');
        }

        this.waitingList.set({
          currentlyWaiting: message.currentlyWaiting,
          inFrontOfSessionHolder: parseInt(await inFrontOfSessionHolder.text()),
          sessionId: message.sessionId,
          isNew: message.isNew,
        });
      }
    });
  }
}
