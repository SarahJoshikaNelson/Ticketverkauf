import {Component, HostListener, Input, OnInit, signal} from '@angular/core';
import {HeroComponent} from '../hero/hero.component';
import {RoutineComponent} from '../routine/routine.component';
import {PointerArrowComponent} from '../pointer-arrow/pointer-arrow.component';
import {PictureShowComponent} from '../picture-show/picture-show.component';
import { FooterComponent } from "../footer/footer.component";
import { ActivatedRoute } from '@angular/router';
import { DialogService } from '../dialog.service';
import { KeycloakService } from 'keycloak-angular';
import { PhaseService } from '../phase.service';
import { DataProviderService, Routine } from '../data-provider.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    RoutineComponent,
    PointerArrowComponent,
    PictureShowComponent,
    FooterComponent
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  constructor(private route : ActivatedRoute, private dialogService: DialogService, private keycloakService: KeycloakService, private phaseService: PhaseService, private dataProviderService: DataProviderService  ) {
  }

  title = signal<string>('');
  subtitle = signal<string>('');

  schedule = signal<Routine[]>([]);

  async ngOnInit() {
    this.schedule.set(this.dataProviderService.getScheduleLocal() || []);
    this.title.set(this.dataProviderService.getTitleLocal() || '');
    this.subtitle.set(this.dataProviderService.getSubtitleLocal() || '');
    await this.saveDatas();
  }

  async saveDatas() {
    const [schedule, title, subtitle] = await Promise.all([
      this.dataProviderService.getSchedule(),
      this.dataProviderService.getTitle(),
      this.dataProviderService.getSubtitle()
    ]);
    
    this.schedule.set(schedule);
    this.title.set(title);
    this.subtitle.set(subtitle);
    
    this.dataProviderService.saveScheduleLocal(schedule);
    this.dataProviderService.saveTitleLocal(title);
    this.dataProviderService.saveSubtitleLocal(subtitle);
  }

  @Input()
  color : string = 'violet';

  arrowActive = signal(true);

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    this.arrowActive.set(false);
  }
}
