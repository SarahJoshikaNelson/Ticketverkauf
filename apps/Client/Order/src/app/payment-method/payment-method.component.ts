import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-method.component.html',
  styleUrl: './payment-method.component.css'
})
export class PaymentMethodComponent implements OnInit {
  paymentForm!: FormGroup;
  paymentMethod: 'credit-card' | 'paypal' | 'bank-transfer' = 'credit-card';
  
  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.initForm();
  }
  
  initForm() {
    this.paymentForm = this.fb.group({
      method: ['credit-card', [Validators.required]],
      // Credit Card Fields
      cardNumber: ['', []],
      cardName: ['', []],
      expiryDate: ['', []],
      cvv: ['', []],
      // PayPal Fields
      paypalEmail: ['', []],
      // Bank Transfer Fields
      bankName: ['', []],
      accountHolder: ['', []],
      iban: ['', []]
    });
    
    // Subscribe to method changes to update validation
    this.paymentForm.get('method')?.valueChanges.subscribe(method => {
      this.paymentMethod = method;
      this.updateFormValidation();
    });
    
    this.updateFormValidation();
  }
  
  updateFormValidation() {
    // Clear all validators first
    this.clearValidators();
    
    // Set validators based on payment method
    switch (this.paymentMethod) {
      case 'credit-card':
        this.paymentForm.get('cardNumber')?.setValidators([Validators.required]);
        this.paymentForm.get('cardName')?.setValidators([Validators.required]);
        this.paymentForm.get('expiryDate')?.setValidators([Validators.required]);
        this.paymentForm.get('cvv')?.setValidators([Validators.required]);
        break;
      case 'paypal':
        this.paymentForm.get('paypalEmail')?.setValidators([Validators.required, Validators.email]);
        break;
      case 'bank-transfer':
        this.paymentForm.get('bankName')?.setValidators([Validators.required]);
        this.paymentForm.get('accountHolder')?.setValidators([Validators.required]);
        this.paymentForm.get('iban')?.setValidators([Validators.required]);
        break;
    }
    
    // Update validity
    Object.keys(this.paymentForm.controls).forEach(key => {
      const control = this.paymentForm.get(key);
      control?.updateValueAndValidity();
    });
  }
  
  clearValidators() {
    Object.keys(this.paymentForm.controls).forEach(key => {
      if (key !== 'method') {
        const control = this.paymentForm.get(key);
        control?.clearValidators();
      }
    });
  }
  
  goBack() {
    this.router.navigate(['/personal-data']);
  }
  
  continueToSummary() {
    /*if (this.paymentForm.valid) {
      const paymentInfo = {
        method: this.paymentForm.get('method')?.value
      };
      
      // Add relevant fields based on payment method
      switch (this.paymentMethod) {
        case 'credit-card':
          paymentInfo.cardNumber = this.paymentForm.get('cardNumber')?.value;
          paymentInfo.cardName = this.paymentForm.get('cardName')?.value;
          paymentInfo.expiryDate = this.paymentForm.get('expiryDate')?.value;
          paymentInfo.cvv = this.paymentForm.get('cvv')?.value;
          break;
        case 'paypal':
          paymentInfo.paypalEmail = this.paymentForm.get('paypalEmail')?.value;
          break;
        case 'bank-transfer':
          paymentInfo.bankName = this.paymentForm.get('bankName')?.value;
          paymentInfo.accountHolder = this.paymentForm.get('accountHolder')?.value;
          paymentInfo.iban = this.paymentForm.get('iban')?.value;
          break;
      }
      
      this.orderService.updatePaymentInfo(paymentInfo);
      this.router.navigate(['/summary']);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.paymentForm.controls).forEach(key => {
        const control = this.paymentForm.get(key);
        control?.markAsTouched();
      });
    }*/

    this.router.navigate(['/summary']);
  }
  
  // Helper method for template
  hasError(controlName: string, errorName: string) {
    const control = this.paymentForm.get(controlName);
    return control?.touched && control?.hasError(errorName);
  }
}