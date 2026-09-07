import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SesionCajaService } from '../services/sesion-caja.service';
import { SesionCaja, EstadoSesion } from '../models/sesion-caja.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { EmpleadoService } from '../../empleados/services/empleado.service';
import { Empleado } from '../../empleados/models/empleado.model';

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
  private readonly sucursalService = inject(SucursalService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly EstadoSesion = EstadoSesion;
  readonly isNew = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showCierrePanel = signal(false);
  readonly snapshot = signal<SesionCaja | null>(null);

  readonly sucursalCtrl = new FormControl('');
  readonly empleadoCtrl = new FormControl('');
  readonly selectedSucursal = signal<SucursalListItem | null>(null);
  readonly selectedEmpleado = signal<Empleado | null>(null);
  readonly sucursalOptions = signal<SucursalListItem[]>([]);
  readonly empleadoOptions = signal<Empleado[]>([]);
  readonly sucursalTouched = signal(false);
  readonly empleadoTouched = signal(false);

  private entityId = '';

  readonly form = this.fb.group({
    fechaHoraApertura: [new Date(), Validators.required],
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

  constructor() {
    this.sucursalCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as SucursalListItem[] });
        return this.sucursalService.search({ nombre: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.sucursalOptions.set(result.items));

    this.empleadoCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as Empleado[] });
        return this.empleadoService.search({ nombres: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.empleadoOptions.set(result.items));
  }

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

  selectSucursal(s: SucursalListItem): void {
    this.selectedSucursal.set(s);
    this.sucursalCtrl.setValue(s.nombre, { emitEvent: false });
    this.sucursalCtrl.setErrors(null);
  }

  selectEmpleado(e: Empleado): void {
    this.selectedEmpleado.set(e);
    this.empleadoCtrl.setValue(e.nombre_Completo, { emitEvent: false });
    this.empleadoCtrl.setErrors(null);
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
    if (this.sucursalCtrl.value !== this.selectedSucursal()?.nombre) this.selectedSucursal.set(null);
    if (this.empleadoCtrl.value !== this.selectedEmpleado()?.nombre_Completo) this.selectedEmpleado.set(null);
    if (!this.selectedSucursal()) {
      this.sucursalCtrl.setErrors({ required: true });
      this.sucursalCtrl.markAsTouched();
    }
    if (!this.selectedEmpleado()) {
      this.empleadoCtrl.setErrors({ required: true });
      this.empleadoCtrl.markAsTouched();
    }
    this.form.markAllAsTouched();
    if (!this.selectedSucursal() || !this.selectedEmpleado() || this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.value;
    this.service.aperturar({
      sucursalId: this.selectedSucursal()!.id,
      empleadoId: this.selectedEmpleado()!.id,
      fechaHoraApertura: (v.fechaHoraApertura as Date).toISOString(),
      montoAperturaEfectivo: v.montoAperturaEfectivo ?? 0,
    }).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('sesionesCaja.create.save-success'));
        this.router.navigate(['/sesiones-caja']);
      },
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('sesionesCaja.create.save-error'));
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
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('sesionesCaja.cierre.save-error'));
      },
    });
  }

  estadoLabel(estado: EstadoSesion): string {
    const key = EstadoSesion[estado] as 'Abierta' | 'Cerrada' | 'Cuadrada';
    return this.transloco.translate(`sesionesCaja.estado.${key}`);
  }
}
