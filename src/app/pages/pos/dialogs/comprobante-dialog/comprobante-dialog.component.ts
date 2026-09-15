import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { ComprobanteDto } from '../../models/venta.model';

export interface ComprobanteDialogLinea {
  productoNombre: string;
  numeroLote: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ComprobanteDialogPago {
  metodo: string;
  monto: number;
}

export interface ComprobanteDialogData {
  comprobante: ComprobanteDto | null;
  total: number;
  subtotal: number;
  igv: number;
  metodosPago: string;
  detalles: ComprobanteDialogLinea[];
  pagos: ComprobanteDialogPago[];
  clienteNombre: string;
  empresaNombre: string | null;
  cajeroNombre: string | null;
  fecha: Date;
}

@Component({
  selector: 'app-comprobante-dialog',
  standalone: true,
  templateUrl: './comprobante-dialog.component.html',
  styleUrl: './comprobante-dialog.component.scss',
  providers: [provideTranslocoScope('pos')],
  imports: [CommonModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class ComprobanteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ComprobanteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ComprobanteDialogData,
  ) {}

  nuevaVenta(): void {
    this.dialogRef.close('nueva');
  }

  volverPOS(): void {
    this.dialogRef.close('volver');
  }

  imprimir(): void {
    window.print();
  }
}
