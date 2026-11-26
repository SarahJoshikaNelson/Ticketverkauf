import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(public dialog: MatDialog) { }

  openDialog(component: any, height: string, width: string, hasBackdrop: boolean, disableClose: boolean, data?: any) {
    const dialogConfig: MatDialogConfig = {
      height: height,
      width: width,
      maxWidth: '100vw',
      maxHeight: '100vh',
      hasBackdrop: hasBackdrop,
      disableClose: disableClose,
      data: data
    };
    this.dialog.open(component, dialogConfig);
  }
}
