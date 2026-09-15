import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface ConfirmarVentaDialogData {
  total: number;
  itemsCount: number;
  clienteNombre: string;
  metodosPago: string[];
  montoPendiente: number;
}

@Component({
  selector: 'app-confirmar-venta-dialog',
  standalone: true,
  templateUrl: './confirmar-venta-dialog.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [CommonModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class ConfirmarVentaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmarVentaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarVentaDialogData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
