import { Component, Input, OnChanges, SimpleChanges, signal, computed, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, inject } from '@angular/core';
import { QueueService } from '../queue.service';

type StepRecord<T> = {
  [key: number]: T;
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnChanges, OnInit, AfterViewInit {
  @ViewChildren('stepElement') stepElements!: QueryList<ElementRef>;
  
  private readonly queueService = inject(QueueService);
  
  // Expose queue service duration
  readonly duration = this.queueService.duration;

  isWaitingList = signal(true);

  @Input() set currentStep(value: number) {
    this.currentStepSignal.set(value);
  }
  
  @Input() set isWaitingListInput(value: boolean) {
    this.isWaitingList.set(value);
  }
  
  // Signals
  currentStepSignal = signal(1);
  
  // Computed values
  progressWidths = computed<StepRecord<string>>(() => {
    const currentStep = this.currentStepSignal();
    return {
      1: currentStep < 1 ? '0%' : currentStep > 1 ? '100%' : '50%',
      2: currentStep < 2 ? '0%' : currentStep > 2 ? '100%' : '50%',
      3: currentStep < 3 ? '0%' : currentStep > 3 ? '100%' : '50%',
      4: currentStep < 4 ? '0%' : currentStep > 4 ? '100%' : '50%',
      5: currentStep < 5 ? '0%' : currentStep > 5 ? '100%' : '50%',
      6: currentStep < 6 ? '0%' : currentStep > 6 ? '100%' : '50%'
    };
  });
  
  completedSteps = computed<StepRecord<boolean>>(() => {
    const currentStep = this.currentStepSignal();
    return { 
      1: currentStep > 1,
      2: currentStep > 2,
      3: currentStep > 3,
      4: currentStep > 4,
      5: currentStep > 5
    };
  });
  
  currentSteps = computed<StepRecord<boolean>>(() => {
    const currentStep = this.currentStepSignal();
    return {
      1: currentStep === 1,
      2: currentStep === 2,
      3: currentStep === 3,
      4: currentStep === 4,
      5: currentStep === 5
    };
  });
  
  isConfirmationRedirect = signal(false);
  isConfirmation = signal(false);
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep'] && !changes['currentStep'].firstChange) {
      this.currentStepSignal.set(changes['currentStep'].currentValue);
      this.scrollToCurrentStep();
    }
  }
  
  async ngOnInit(): Promise<void> {
    // Fetch duration if not already loaded
    if (this.duration() === 0) {
      await this.queueService.fetchDuration();
    }
    
    // Update flags based on current URL
    this.updateFlagsFromUrl();
  }
  
  ngAfterViewInit(): void {
    // Scroll to current step after view is initialized
    setTimeout(() => this.scrollToCurrentStep(), 100);
  }
  
  private updateFlagsFromUrl(): void {
    const url = window.location.href;
    this.isConfirmationRedirect.set(url.includes('confirmation-redirect'));
    this.isConfirmation.set(url.includes('confirmation') && !url.includes('confirmation-redirect'));
  }
  
  scrollToCurrentStep(): void {
    const currentStep = this.currentStepSignal();
    if (this.stepElements && this.stepElements.length > 0) {
      const stepElement = this.stepElements.toArray()[currentStep - 1];
      if (stepElement && stepElement.nativeElement) {
        stepElement.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }
  
  getProgressWidth(step: number): string {
    return this.progressWidths()[step] || '0%';
  }
  
  isCompleted(step: number): boolean {
    return this.completedSteps()[step] || false;
  }
  
  isCurrent(step: number): boolean {
    return this.currentSteps()[step] || false; 
  }
}
