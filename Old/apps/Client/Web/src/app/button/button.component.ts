import {
  Component,
  EventEmitter,
  inject,
  input,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  name = input<string>('');

  @Output()
  action: EventEmitter<void> = new EventEmitter<void>();

  size = input<{ height: string; width: string }>({
    height: '2.5rem',
    width: 'auto',
  });
  color = input<string>('violet');
  isLoading = input<boolean | undefined>(undefined);
}
