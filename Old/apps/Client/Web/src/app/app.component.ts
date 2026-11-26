import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './nav/nav.component';
import { TicketService } from './ticket.service';
import { StyleService } from './style.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  constructor(
    private ticketService: TicketService,
    private styleService: StyleService
  ) {}

  async ngOnInit() {
    const styles = this.styleService.getStylesLocal();
    this.styleService.applyStyles(styles);

    try {
      this.saveDatas();
    } catch (error) {
      console.error('Failed to save datas:', error);
    }
  }

  async saveDatas() {
    const styles = await this.styleService.getStyles();
    this.styleService.applyStyles(styles);
    this.styleService.saveStylesLocal(styles);
  }

  title = 'frontend';
}
