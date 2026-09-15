import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SesionCajaService } from '../../../sesiones-caja/services/sesion-caja.service';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { Empleado } from '../../../empleados/models/empleado.model';

@Component({
  selector: 'app-aperturar-caja-dialog',
  standalone: true,
  templateUrl: './aperturar-caja-dialog.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [CommonModule, ReactiveFormsModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class AperturarCajaDialogComponent {
  private readonly authService = inject(AuthService);
  private readonly service = inject(SesionCajaService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  readonly dialogRef = inject(MatDialogRef<AperturarCajaDialogComponent>);

  readonly saving = signal(false);
  readonly empleadoOptions = signal<Empleado[]>([]);
  readonly selectedEmpleado = signal<Empleado | null>(null);
  readonly empleadoTouched = signal(false);

  readonly empleadoCtrl = new FormControl('');
  readonly montoCtrl = new FormControl(0, [Validators.required, Validators.min(0)]);

  constructor() {
    this.empleadoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as Empleado[] });
          this.selectedEmpleado.set(null);
          return this.empleadoService.search({ nombres: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.empleadoOptions.set(result.items));
  }

  displayEmpleado = (e: Empleado | string | null): string => (e && typeof e === 'object' ? e.nombre_Completo : (e ?? ''));

  onEmpleadoSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedEmpleado.set(event.option.value as Empleado);
  }

  aperturar(): void {
    this.empleadoTouched.set(true);
    this.montoCtrl.markAsTouched();
    const sucursalId = this.authService.sucursalId();
    if (!this.selectedEmpleado() || this.montoCtrl.invalid || !sucursalId) {
      return;
    }

    this.saving.set(true);
    this.service
      .aperturar({
        sucursalId,
        empleadoId: this.selectedEmpleado()!.id,
        fechaHoraApertura: new Date().toISOString(),
        montoAperturaEfectivo: this.montoCtrl.value ?? 0,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifier.showSuccess(this.transloco.translate('pos.checkout.aperturarCajaSuccess'));
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('pos.checkout.aperturarCajaError'));
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
