import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogActions,
} from '@angular/material/dialog';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface ThreeOptionDialogData {
  title: string;
  message: string;
  option1: { option1Text: string, disabled?: boolean };
  option2: { option2Text: string, disabled?: boolean };
  option3: { option3Text: string, disabled?: boolean };
}

@Component({
  selector: 'csw-three-option-dialog',
  templateUrl: './three-option-dialog.component.html',
  imports: [MatDialogActions, MaterialModule, TranslocoModule],
})
export class ThreeOptionDialogComponent {
  public dialogRef = inject(MatDialogRef<ThreeOptionDialogComponent>);
  transloco = inject(TranslocoService);
  public data = inject(MAT_DIALOG_DATA) as ThreeOptionDialogData;

  option1Text: string;
  option2Text: string;
  option3Text: string;
  option1Disabled: boolean;
  option2Disabled: boolean;
  option3Disabled: boolean;

  constructor() {
    this.option1Text =
      this.data.option1.option1Text ||
      this.transloco.translate('actions.option1');
    this.option2Text =
      this.data.option2.option2Text ||
      this.transloco.translate('actions.option2');
    this.option3Text =
      this.data.option3.option3Text ||
      this.transloco.translate('actions.option3');
    this.option1Disabled = this.data.option1.disabled ?? false;
    this.option2Disabled = this.data.option2.disabled ?? false;
    this.option3Disabled = this.data.option3.disabled ?? false;
  }

  onOption1(): void {
    this.dialogRef.close('option1');
  }

  onOption2(): void {
    this.dialogRef.close('option2');
  }

  onOption3(): void {
    this.dialogRef.close('option3');
  }
}