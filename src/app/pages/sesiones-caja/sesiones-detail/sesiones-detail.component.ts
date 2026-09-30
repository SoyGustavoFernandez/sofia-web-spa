import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SesionCajaService } from '../services/sesion-caja.service';
import { SesionCaja, EstadoSesion } from '../models/sesion-caja.model';

// Backend close-rule codes that have a specific message instead of the generic close error
const CIERRE_ERROR_KEYS: Record<string, string> = {
  'PosSesionCaja.NoPropia': 'sesionesCaja.cierre.no-propia',
  'Concurrency.Conflict': 'errors.concurrencyConflict',
};

// Backend opening-rule codes that have a specific message instead of the generic opening error
const APERTURA_ERROR_KEYS: Record<string, string> = {
  'PosSesionCaja.YaAbierta': 'sesionesCaja.create.ya-abierta',
  'Concurrency.Conflict': 'errors.concurrencyConflict',
};

@Component({
  selector: 'app-sesiones-detail',
  standalone: true,
  templateUrl: './sesiones-detail.component.html',
  styles: [`
    .cierre-panel { border: 1px solid var(--mat-divider-color, #e0e0e0); border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .lote-option { display: flex; flex-direction: column; line-height: 1.3; padding: 2px 0; }
    .lote-option__numero { font-weight: 500; }
    .lote-option__sub { font-size: 0.8em; opacity: 0.65; }
  `],
  providers: [provideTranslocoScope('sesiones-caja')],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class SesionesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SesionCajaService);
  private readonly authService = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly EstadoSesion = EstadoSesion;
  readonly isNew = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showCierrePanel = signal(false);
  readonly snapshot = signal<SesionCaja | null>(null);

  // The backend opens the session for the logged-in cashier, in their active branch, at server time
  readonly cajero = computed(() => this.authService.currentUser()?.fullName ?? '');

  private entityId = '';

  readonly form = this.fb.group({
    montoAperturaEfectivo: [0, [Validators.required, Validators.min(0)]],
  });

  readonly cierreForm = this.fb.group({
    montoCierreDeclarado: [0, [Validators.required, Validators.min(0)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.puntoVenta' },
    { label: 'breadcrumbs.sesionesCaja', route: '/sesiones-caja' },
  ];

  ngOnInit(): void {
    if (this.route.snapshot.data['isNew'] === true) {
      this.isNew.set(true);
      return;
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/sesiones-caja']);
      return;
    }
    this.entityId = id;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId).subscribe({
      next: res => {
        this.snapshot.set(res.value);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('sesionesCaja.detail.load-error'));
      },
    });
  }

  aperturar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.service.aperturar({
      montoAperturaEfectivo: this.form.value.montoAperturaEfectivo ?? 0,
    }).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('sesionesCaja.create.save-success'));
        this.router.navigate(['/sesiones-caja']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? APERTURA_ERROR_KEYS[code] : undefined;
        this.notifier.showError(this.transloco.translate(key ?? 'sesionesCaja.create.save-error'));
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/sesiones-caja']);
  }

  confirmarCierre(): void {
    this.cierreForm.markAllAsTouched();
    if (this.cierreForm.invalid) return;

    this.saving.set(true);
    const monto = this.cierreForm.value.montoCierreDeclarado ?? 0;
    this.service.cerrar(this.entityId, monto).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('sesionesCaja.cierre.save-success'));
        this.router.navigate(['/sesiones-caja']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? CIERRE_ERROR_KEYS[code] : undefined;
        this.notifier.showError(this.transloco.translate(key ?? 'sesionesCaja.cierre.save-error'));
      },
    });
  }

  estadoLabel(estado: EstadoSesion): string {
    const key = EstadoSesion[estado] as 'Abierta' | 'Cerrada' | 'Cuadrada';
    return this.transloco.translate(`sesionesCaja.estado.${key}`);
  }
}
