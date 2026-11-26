import { Component, Input, Signal, signal } from '@angular/core';
import { DataProviderService, Routine } from '../data-provider.service';

@Component({
  selector: 'app-routine',
  standalone: true,
  imports: [],
  templateUrl: './routine.component.html',
  styleUrl: './routine.component.css'
})
export class RoutineComponent {
  @Input()
  color: string = 'violet';

  @Input()
  routines: Routine[] = [];

  public toDate(date: string) {
    return new Date(date);
  }
}
