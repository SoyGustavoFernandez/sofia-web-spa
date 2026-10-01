import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { ComprobanteDto, estadoComprobanteKey } from '../../models/venta.model';
import { tipoDocumentoKey } from '@shared/utils/tipo-documento.util';

const NUMERO_CLIENTE_EVENTUAL = '00000000';

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
  private readonly transloco = inject(TranslocoService);

  constructor(
    public dialogRef: MatDialogRef<ComprobanteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ComprobanteDialogData,
  ) {}

  estadoLabel(estado: string): string {
    const key = estadoComprobanteKey(estado);
    return key ? this.transloco.translate(key) : estado;
  }

  // Customer document as printed on the receipt (e.g. "DNI 45781236"); the anonymous customer has none
  clienteDocumento(): string | null {
    const c = this.data.comprobante;
    if (!c || c.clienteNumeroDocumento === NUMERO_CLIENTE_EVENTUAL) return null;
    const key = c.clienteTipoDocumento !== '-' ? tipoDocumentoKey(c.clienteTipoDocumento) : null;
    return key ? `${this.transloco.translate(key)} ${c.clienteNumeroDocumento}` : c.clienteNumeroDocumento;
  }

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
