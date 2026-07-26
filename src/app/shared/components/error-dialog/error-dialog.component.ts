import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions } from '@angular/material/dialog';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from "@shared/material.module";

export interface ErrorDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'csw-error-dialog',
  templateUrl: './error-dialog.component.html',
  imports: [MatDialogActions, MaterialModule, TranslocoModule, CommonModule],
})
export class ErrorDialogComponent {
  public dialogRef = inject(MatDialogRef<ErrorDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as { errors: string[] };

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
