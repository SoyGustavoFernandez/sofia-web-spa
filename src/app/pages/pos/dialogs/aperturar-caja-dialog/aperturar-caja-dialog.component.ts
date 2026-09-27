import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SesionCajaService } from '../../../sesiones-caja/services/sesion-caja.service';

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
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  readonly dialogRef = inject(MatDialogRef<AperturarCajaDialogComponent>);

  readonly saving = signal(false);
  // The backend opens the register for the logged-in cashier; shown read-only so the user knows whose name it goes under
  readonly cajero = computed(() => this.authService.currentUser()?.fullName ?? '');

  readonly montoCtrl = new FormControl(0, [Validators.required, Validators.min(0)]);

  aperturar(): void {
    this.montoCtrl.markAsTouched();
    if (this.montoCtrl.invalid) {
      return;
    }

    this.saving.set(true);
    this.service
      .aperturar({ montoAperturaEfectivo: this.montoCtrl.value ?? 0 })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifier.showSuccess(this.transloco.translate('pos.checkout.aperturarCajaSuccess'));
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          const yaAbierta = err instanceof HttpErrorResponse && err.error?.code === 'PosSesionCaja.YaAbierta';
          this.notifier.showError(this.transloco.translate(yaAbierta ? 'pos.checkout.cajaYaAbierta' : 'pos.checkout.aperturarCajaError'));
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
