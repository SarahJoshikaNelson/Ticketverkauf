import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-warning-dialog',
  standalone: true,
  imports: [],
  templateUrl: './warning-dialog.component.html',
  styleUrl: './warning-dialog.component.css'
})
export class WarningDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { info: string, desc: string, action: () => void }, public dialogRef: MatDialogRef<WarningDialogComponent>) {}
}
