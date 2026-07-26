import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogActions,
} from '@angular/material/dialog';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface SimpleDialogData {
  title: string;
  message: string;
  buttonText?: string;
}

@Component({
  selector: 'csw-simple-dialog',
  templateUrl: './simple-dialog.component.html',
  styleUrls: ['./simple-dialog.component.scss'],
  imports: [MatDialogActions, MaterialModule, TranslocoModule],
})
export class SimpleDialogComponent {
  public dialogRef = inject(MatDialogRef<SimpleDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as SimpleDialogData;

  onClose(): void {
    this.dialogRef.close();
  }
}
