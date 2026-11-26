import {
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-number-select',
  imports: [FormsModule],
  templateUrl: './number-select.component.html',
  styleUrl: './number-select.component.css',
})
export class NumberSelectComponent {
  public min = input<number>(0);
  public max = input.required<number>();
  public decrementDisabled = input<boolean>(false);
  public incrementDisabled = input<boolean>(false);

  public inputValue = model.required<number>();

  public valueChange = output<number>();

  constructor() {
    // REMOVED: This effect was causing infinite loops!
    // The clamping is now done in the increment/decrement methods
    // and the input is readonly, so manual changes aren't possible
  }

  actualDecrementDisabled = computed(
    () => this.inputValue() <= this.min() || this.decrementDisabled()
  );
  actualIncrementDisabled = computed(
    () => this.inputValue() >= this.max() || this.incrementDisabled()
  );

  increment() {
    if (this.inputValue() < this.max()) {
      this.inputValue.set(this.inputValue() + 1);
      this.onValueChange();
    }
  }

  decrement() {
    if (this.inputValue() > this.min()) {
      this.inputValue.set(this.inputValue() - 1);
      this.onValueChange();
    }
  }

  onValueChange() {
    this.valueChange.emit(this.inputValue());
  }
}
