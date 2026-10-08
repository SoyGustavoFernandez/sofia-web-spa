import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { MaterialModule } from '@shared/material.module';
import { saveErrorKey } from '@shared/utils/save-error-key.util';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { ProveedorService } from '../services/proveedor.service';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';

export interface PrecioProveedorDialogData {
  proveedorId: string;
}

export const PRECIO_COMPRA_MAX = 9999999.9999;

const SAVE_ERROR_KEYS: Record<string, string> = {
  'Proveedor.NotFound': 'proveedores.precios.dialog.errors.proveedor-not-found',
  'Medicamento.NotFound': 'proveedores.precios.dialog.errors.medicamento-not-found',
};

type PrecioForm = FormGroup<{
  producto: FormControl<MedicamentoListItem | string | null>;
  precioCompra: FormControl<number | null>;
  descuentoPorcentaje: FormControl<number | null>;
}>;

// A product counts as chosen only when it was picked from the list, not merely typed
function productoSeleccionado(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'object' && value !== null ? null : { productoSeleccion: true };
}

// Net cost per base unit, rounded to the 4 decimals the backend stores
export function costoNeto(precioCompra: number, descuentoPorcentaje: number): number {
  const neto = precioCompra * (1 - descuentoPorcentaje / 100);
  return Math.round((neto + Number.EPSILON) * 10000) / 10000;
}

@Component({
  selector: 'app-precio-proveedor-dialog',
  standalone: true,
  templateUrl: './precio-proveedor-dialog.component.html',
  providers: [provideTranslocoScope('proveedores')],
  imports: [CommonModule, ReactiveFormsModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class PrecioProveedorDialogComponent {
  private readonly service = inject(ProveedorService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialogRef = inject(MatDialogRef<PrecioProveedorDialogComponent, boolean>);
  private readonly data = inject<PrecioProveedorDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly productoOptions = signal<MedicamentoListItem[]>([]);

  readonly form: PrecioForm = new FormGroup({
    producto: new FormControl<MedicamentoListItem | string | null>(null, [Validators.required, productoSeleccionado]),
    precioCompra: new FormControl<number | null>(null, [Validators.required, Validators.min(0.0001), Validators.max(PRECIO_COMPRA_MAX)]),
    descuentoPorcentaje: new FormControl<number | null>(0, [Validators.required, Validators.min(0), Validators.max(100)]),
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });

  readonly costoNeto = computed(() => {
    const { precioCompra, descuentoPorcentaje } = this.formValue();
    const valid = this.form.controls.precioCompra.valid && this.form.controls.descuentoPorcentaje.valid;
    return valid && precioCompra != null && descuentoPorcentaje != null ? costoNeto(precioCompra, descuentoPorcentaje) : null;
  });

  constructor() {
    this.form.controls.producto.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string' || !term.trim()) return of([] as MedicamentoListItem[]);
          // A user without Medicamentos:Leer gets no options instead of a broken dialog
          return this.medicamentoService.search({ nombreComercial: term.trim(), pageNumber: 1, pageSize: 20 }).pipe(
            map(result => result.items),
            catchError(() => of([] as MedicamentoListItem[])),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(items => this.productoOptions.set(items));
  }

  displayProducto(value: MedicamentoListItem | string | null): string {
    return typeof value === 'object' && value !== null ? value.nombreComercial : (value ?? '');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { producto, precioCompra, descuentoPorcentaje } = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .registrarPrecio({
        proveedorId: this.data.proveedorId,
        medicamentoId: (producto as MedicamentoListItem).id,
        precioCompra: precioCompra!,
        descuentoPorcentaje: descuentoPorcentaje!,
      })
      .subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('proveedores.precios.dialog.success'));
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate(saveErrorKey(err, SAVE_ERROR_KEYS, 'proveedores.precios.dialog.save-error')));
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
