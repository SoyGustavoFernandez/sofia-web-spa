import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { VentaService } from '../../services/venta.service';
import { DestinoDevolucion, MetodoPago, ProcesarDevolucionRequest, VentaConDetalle, VentaDetalle } from '../../models/venta.model';

export interface DevolverVentaDialogData {
  venta: VentaConDetalle;
}

// SUNAT catalog 09 credit note reasons used for returns
export const MOTIVO_DEVOLUCION_TOTAL = '06';
export const MOTIVO_DEVOLUCION_POR_ITEM = '07';

// Backend return-rule codes that have a specific message instead of the generic return error
const DEVOLVER_ERROR_KEYS: Record<string, string> = {
  'Venta.NotFound': 'pos.devolucion.errors.ventaNotFound',
  'Devolucion.Venta.OtraSucursal': 'pos.devolucion.errors.otraSucursal',
  'Devolucion.Caja.SinSesionAbierta': 'pos.devolucion.errors.sinSesionAbierta',
  'Devolucion.ComprobanteOrigen.NoEmitido': 'pos.devolucion.errors.comprobanteNoEmitido',
  'Devolucion.SerieNotaCredito.NoConfigurada': 'pos.devolucion.errors.serieNcNoConfigurada',
  'Devolucion.Venta.EstadoInvalido': 'pos.devolucion.errors.estadoInvalido',
  'Devolucion.Cantidad.Excedida': 'pos.devolucion.errors.cantidadExcedida',
  'DetalleVenta.NotFound': 'pos.devolucion.errors.detalleNotFound',
  'Concurrency.Conflict': 'errors.concurrencyConflict',
};

const METODO_PAGO_KEYS: Record<MetodoPago, string> = {
  [MetodoPago.Efectivo]: 'efectivo',
  [MetodoPago.YapePlin]: 'yapePlin',
  [MetodoPago.Tarjeta]: 'tarjeta',
  [MetodoPago.Transferencia]: 'transferencia',
};

export interface LineaDevolucion {
  detalle: VentaDetalle;
  devolvible: number;
}

type LineaForm = FormGroup<{ cantidad: FormControl<number>; destino: FormControl<DestinoDevolucion> }>;

export function cantidadDevolvible(detalle: VentaDetalle): number {
  return Math.max(0, detalle.cantidad - detalle.cantidadDevuelta);
}

@Component({
  selector: 'app-devolver-venta-dialog',
  standalone: true,
  templateUrl: './devolver-venta-dialog.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [CommonModule, ReactiveFormsModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class DevolverVentaDialogComponent {
  private readonly service = inject(VentaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  readonly dialogRef = inject(MatDialogRef<DevolverVentaDialogComponent>);
  readonly data = inject<DevolverVentaDialogData>(MAT_DIALOG_DATA);

  readonly DestinoDevolucion = DestinoDevolucion;
  readonly motivos = [MOTIVO_DEVOLUCION_TOTAL, MOTIVO_DEVOLUCION_POR_ITEM];
  readonly metodosReembolso = [MetodoPago.Efectivo, MetodoPago.YapePlin, MetodoPago.Tarjeta, MetodoPago.Transferencia];
  readonly columns = ['producto', 'numeroLote', 'vendido', 'devuelto', 'devolvible', 'cantidad', 'destino'];

  readonly lineas: LineaDevolucion[] = this.data.venta.detalles
    .map(detalle => ({ detalle, devolvible: cantidadDevolvible(detalle) }))
    .filter(l => l.devolvible > 0);

  readonly lineasForm = new FormArray<LineaForm>(
    this.lineas.map(
      l =>
        new FormGroup({
          cantidad: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(l.devolvible)] }),
          destino: new FormControl<DestinoDevolucion>(DestinoDevolucion.Reingreso_Venta, { nonNullable: true }),
        }),
    ),
  );

  readonly form = new FormGroup({
    motivo: new FormControl<string>(MOTIVO_DEVOLUCION_POR_ITEM, { nonNullable: true, validators: [Validators.required] }),
    sustento: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    metodoReembolso: new FormControl<MetodoPago>(MetodoPago.Efectivo, { nonNullable: true }),
  });

  readonly saving = signal(false);
  private readonly cantidades = toSignal(this.lineasForm.valueChanges, { initialValue: this.lineasForm.value });

  readonly montoEstimado = computed(() =>
    this.cantidades().reduce((total, linea, i) => total + (linea.cantidad ?? 0) * this.lineas[i].detalle.precioUnitario, 0),
  );

  readonly hayCantidades = computed(() => this.cantidades().some(l => (l.cantidad ?? 0) > 0));

  constructor() {
    // Taking back everything still returnable is a total return (06); anything less is per item (07)
    this.lineasForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const total = this.lineas.every((l, i) => this.lineasForm.at(i).controls.cantidad.value >= l.devolvible);
      this.form.controls.motivo.setValue(total ? MOTIVO_DEVOLUCION_TOTAL : MOTIVO_DEVOLUCION_POR_ITEM);
    });
  }

  // Keeps each typed quantity between zero and what remains returnable on that line
  capCantidad(index: number): void {
    const ctrl = this.lineasForm.at(index).controls.cantidad;
    const capped = Math.min(Math.max(Number(ctrl.value) || 0, 0), this.lineas[index].devolvible);
    if (capped !== ctrl.value) {
      ctrl.setValue(capped);
    }
  }

  devolverTodo(): void {
    this.lineas.forEach((l, i) => this.lineasForm.at(i).controls.cantidad.setValue(l.devolvible));
  }

  metodoPagoLabel(metodo: MetodoPago): string {
    return this.transloco.translate(`pos.checkout.${METODO_PAGO_KEYS[metodo]}`);
  }

  buildRequest(): ProcesarDevolucionRequest {
    const value = this.form.getRawValue();
    return {
      comprobanteOrigenId: this.data.venta.id,
      motivoSunatCatalogo: value.motivo,
      sustentoDescriptivo: value.sustento.trim(),
      metodoReembolso: value.metodoReembolso,
      detalles: this.lineas
        .map((linea, i) => ({ linea, value: this.lineasForm.at(i).getRawValue() }))
        .filter(x => x.value.cantidad > 0)
        .map(x => ({
          detalleVentaId: x.linea.detalle.id,
          cantidadDevuelta: x.value.cantidad,
          destinoFisicoLogico: x.value.destino,
        })),
    };
  }

  onConfirm(): void {
    this.form.markAllAsTouched();
    this.lineasForm.markAllAsTouched();
    if (!this.hayCantidades()) {
      this.notifier.showError(this.transloco.translate('pos.devolucion.sinCantidades'));
      return;
    }
    if (this.form.invalid || this.lineasForm.invalid || !this.form.controls.sustento.value.trim()) {
      return;
    }

    this.saving.set(true);
    this.service.procesarDevolucion(this.buildRequest()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifier.showSuccess(this.transloco.translate('pos.devolucion.success'));
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? DEVOLVER_ERROR_KEYS[code] : undefined;
        this.notifier.showError(this.transloco.translate(key ?? 'pos.devolucion.error'));
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
