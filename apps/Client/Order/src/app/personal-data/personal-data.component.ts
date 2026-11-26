import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';
import { Customer } from '@ticket-system/models';
import { KeycloakService } from 'keycloak-angular';
import {LoginToken} from '@ticket-system/models/order';
@Component({
  selector: 'app-personal-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-data.component.html',
  styleUrl: './personal-data.component.css'
})
export class PersonalDataComponent implements OnInit {
  personalForm!: FormGroup;
  personalInfo!: Customer;

  isLoggedIn = signal<boolean>(false);
  emailError = signal<string | null>(null);
  emailDomainValid = signal<boolean>(true);
  authError = signal<string | null>(null);

  verificationCodeSent = signal<boolean>(false);
  emailVerified = signal<boolean>(false);
  sendingCode = signal<boolean>(false);
  verifyingCode = signal<boolean>(false);
  verificationError = signal<string | null>(null);
  verificationCode = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private keycloakService: KeycloakService
  ) {}

  async ngOnInit() {
    this.initForm();

    this.personalForm.get('mailAddress')?.valueChanges.subscribe(() => {
      this.emailDomainValid.set(true);
      this.emailError.set(null);
      this.verificationCodeSent.set(false);
      this.emailVerified.set(false);
      this.verificationError.set(null);
      this.verificationCode.set('');
    });

    if (this.keycloakService.isLoggedIn()) {
      const userProfile = await this.keycloakService.loadUserProfile();
      this.personalForm.patchValue({
        firstName: userProfile.firstName!,
        lastName: userProfile.lastName!,
        mailAddress: userProfile.email!
      });
      this.isLoggedIn.set(true);
    }

    const personalInfo = this.orderService.getPersonalInfoFromSessionStorage();
    if (personalInfo) {
      this.personalForm.patchValue(personalInfo);
    }
  }

  initForm() {
    let groupElements;
    if (this.keycloakService.isLoggedIn()) {
      groupElements = {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        mailAddress: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [Validators.required]],
        street: ['', [Validators.required]],
        streetNumber: ['', [Validators.required]],
        town: ['', [Validators.required]],
        zipCode: ['', [Validators.required]],
        isMale: [true, [Validators.required]]
      };
      this.personalForm = this.fb.group(groupElements);
    } else {
      groupElements = {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        mailAddress: ['', [Validators.required, Validators.email]],
        confirmMailAddress: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(12)]],
        phoneNumber: ['', [Validators.required]],
        street: ['', [Validators.required]],
        streetNumber: ['', [Validators.required]],
        town: ['', [Validators.required]],
        zipCode: ['', [Validators.required]],
        isMale: [true, [Validators.required]]
      };
      this.personalForm = this.fb.group(groupElements, {
        validators: [this.emailMatchValidator]
      });
    }
  }

  private emailMatchValidator(group: AbstractControl): ValidationErrors | null {
    const mail = group.get('mailAddress')?.value;
    const confirm = group.get('confirmMailAddress')?.value;
    if (confirm && mail !== confirm) {
      return { emailMismatch: true };
    }
    return null;
  }

  splitAddress(address: string): { street: string, streetNumber: string } {
    // Simple regex to extract house number from the end of the address
    const match = address.match(/^(.*?)\s+(\d+\s*[a-zA-Z]*)$/);
    if (match) {
      return {
        street: match[1].trim(),
        streetNumber: match[2].trim()
      };
    }
    // If no house number pattern found, return the whole string as street
    return {
      street: address,
      streetNumber: ''
    };
  }

  async onEmailBlur() {
    if (this.isLoggedIn()) return;
    const email = this.personalForm.get('mailAddress')?.value;
    if (!email || this.personalForm.get('mailAddress')?.hasError('email')) {
      return;
    }
    const valid = await this.orderService.validateEmailDomain(email);
    this.emailDomainValid.set(valid);
  }

  async sendVerificationCode() {
    const email = this.personalForm.get('mailAddress')?.value;
    if (!email) return;
    this.sendingCode.set(true);
    this.verificationError.set(null);
    const sent = await this.orderService.sendVerificationCode(email);
    this.sendingCode.set(false);
    if (sent) {
      this.verificationCodeSent.set(true);
    } else {
      this.verificationError.set('Bestätigungscode konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
    }
  }

  async verifyCode() {
    const email = this.personalForm.get('mailAddress')?.value;
    const code = this.verificationCode();
    if (!email || !code) return;
    this.verifyingCode.set(true);
    this.verificationError.set(null);
    const valid = await this.orderService.verifyEmailCode(email, code);
    this.verifyingCode.set(false);
    if (valid) {
      this.emailVerified.set(true);
      this.verificationError.set(null);
    } else {
      this.verificationError.set('Ungültiger oder abgelaufener Code. Bitte versuchen Sie es erneut.');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  async continueToPayment() {
    this.emailError.set(null);
    this.authError.set(null);

    if (!this.emailDomainValid() && !this.emailVerified()) {
      return;
    }

    if (this.personalForm.valid) {
      const { confirmMailAddress, ...customerData } = this.personalForm.value;
      const formData: Customer = customerData;
      if (formData.password !== undefined) {
        try {
          let token: LoginToken | null;
          try {
            token = await this.orderService.login(formData);
          } catch (error: any) {
            if (error.status === 404) {
              try {
                await this.orderService.register(formData);
              } catch (regError: any) {
                if (regError.status === 409) {
                  this.emailError.set(
                    'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie das zugehörige Passwort oder eine andere E-Mail-Adresse.'
                  );
                  return;
                }
                throw regError;
              }
              token = await this.orderService.login(formData);
            } else if (error.status === 401) {
              this.authError.set(
                'Das eingegebene Passwort ist falsch. Bitte versuchen Sie es erneut.'
              );
              return;
            } else {
              throw error;
            }
          }
          sessionStorage.setItem("non-student-auth-token", token.token);
        } catch (error) {
          this.authError.set(
            'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.'
          );
          return;
        }
      }
      this.orderService.updatePersonalInfo(formData);
      await this.router.navigate(['/summary']);
    } else {
      Object.keys(this.personalForm.controls).forEach(key => {
        const control = this.personalForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  hasError(controlName: string, errorName: string) {
    const control = this.personalForm.get(controlName);
    return control?.touched && control?.hasError(errorName);
  }
}
