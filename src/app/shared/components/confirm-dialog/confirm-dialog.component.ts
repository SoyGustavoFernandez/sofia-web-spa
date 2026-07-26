import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogActions,
} from '@angular/material/dialog';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

@Component({
  selector: 'csw-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  imports: [MatDialogActions, MaterialModule, TranslocoModule],
})
export class ConfirmDialogComponent {
  public dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  transloco = inject(TranslocoService);
  public data = inject(MAT_DIALOG_DATA) as ConfirmDialogData;

  confirmButtonText = this.data.confirmButtonText;
  cancelButtonText = this.data.cancelButtonText;

  constructor() {
    this.confirmButtonText =
      this.data.confirmButtonText ||
      this.transloco.translate('actions.confirm');
    this.cancelButtonText =
      this.data.cancelButtonText || this.transloco.translate('actions.cancel') ;
  }
  
  onConfirm(): void {
    this.dialogRef.close(true); // 👈 Devuelve true si confirma
  }

  onCancel(): void {
    this.dialogRef.close(false); // 👈 Devuelve false si cancela
  }
}
