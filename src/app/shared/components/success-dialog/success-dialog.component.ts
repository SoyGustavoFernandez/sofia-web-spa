import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogActions,
} from '@angular/material/dialog';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface SuccessDialogData {
  title: string;
  message: string;
  buttonText?: string;
}

@Component({
  selector: 'csw-success-dialog',
  templateUrl: './success-dialog.component.html',
  styleUrls: ['./success-dialog.component.scss'],
  imports: [MatDialogActions, MaterialModule, TranslocoModule],
})
export class SuccessDialogComponent {
  public dialogRef = inject(MatDialogRef<SuccessDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as SuccessDialogData;

  onClose(): void {
    this.dialogRef.close();
  }
}
