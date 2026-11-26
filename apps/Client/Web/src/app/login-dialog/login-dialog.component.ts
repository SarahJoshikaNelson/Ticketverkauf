import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [],
  templateUrl: './login-dialog.component.html',
  styleUrl: './login-dialog.component.css'
})
export class LoginDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { login: () => void }, private dialog: MatDialogRef<LoginDialogComponent>) {}

  close() {
    this.dialog.close();
  }
}
