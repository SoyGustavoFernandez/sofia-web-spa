import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map, switchMap } from 'rxjs';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AutocompleteInputComponent } from '@shared/components/autocomplete-input/autocomplete-input.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { CuentaService } from '../services/cuenta.service';
import { CuentaDto, EmpleadoItem } from '../models/cuenta.model';
import { RolService } from '../../roles/services/rol.service';
import { RolResponse } from '../../roles/models/rol.model';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';

@Component({
  selector: 'app-cuentas-detail',
  standalone: true,
  templateUrl: './cuentas-detail.component.html',
  providers: [provideTranslocoScope('cuentas')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
    AutocompleteInputComponent,
  ],
})
export class CuentasDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(CuentaService);
  private readonly rolService = inject(RolService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly empleadoError = signal(false);
  readonly assigningRol = signal(false);
  readonly removingRolId = signal<string | null>(null);
  readonly assigningSucursal = signal(false);
  readonly removingSucursalId = signal<string | null>(null);
  readonly pendingRol = signal<RolResponse | null>(null);

  private entityId: string | null = null;
  private empleadoId: string | null = null;
  readonly entity = signal<CuentaDto | null>(null);

  readonly fetchEmpleados = (query: string): Observable<EmpleadoItem[]> =>
    this.service.searchEmpleados(query).pipe(map(r => r.items));

  readonly displayEmpleado = (e: EmpleadoItem): string => e.nombre_Completo;

  readonly fetchRoles = (query: string): Observable<RolResponse[]> =>
    this.rolService.search({ nombreRol: query, pageNumber: 1, pageSize: 20 }).pipe(map(r => r.items));

  readonly displayRol = (r: RolResponse): string => r.nombreRol;

  readonly fetchSucursales = (query: string): Observable<SucursalListItem[]> =>
    this.service.searchSucursales(query).pipe(map(r => r.items));

  readonly displaySucursal = (s: SucursalListItem): string => s.nombre;

  readonly createForm = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  readonly editForm = this.fb.group({
    cuentaActiva: [true as boolean],
    forzarCambioClave: [false as boolean],
    resetearIntentos: [false as boolean],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.cuentas', route: '/cuentas' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.entity.set(data);
        this.editForm.patchValue({
          cuentaActiva: data.cuentaActiva,
          forzarCambioClave: false,
          resetearIntentos: false,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.notifier.showServerError(err, this.transloco.translate('cuentas.detail.load-error'));
      },
    });
  }

  onEmpleadoSelected(emp: EmpleadoItem | null): void {
    this.empleadoId = emp?.id ?? null;
    if (emp) this.empleadoError.set(false);
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/cuentas']);
    } else {
      this.isEditMode.set(false);
      this.pendingRol.set(null);
      const data = this.entity();
      if (data) {
        this.editForm.patchValue({
          cuentaActiva: data.cuentaActiva,
          forzarCambioClave: false,
          resetearIntentos: false,
        });
      }
    }
  }

  save(): void {
    if (this.isNew()) {
      this.createForm.markAllAsTouched();
      if (!this.empleadoId) this.empleadoError.set(true);
      if (this.createForm.invalid || !this.empleadoId) return;
      this.saving.set(true);
      const { nombreUsuario, password } = this.createForm.value;
      this.service.create({ empleadoId: this.empleadoId, nombreUsuario: nombreUsuario!, password: password! }).subscribe({
        next: res => {
          this.saving.set(false);
          this.notifier.showSuccess(this.transloco.translate('cuentas.detail.save-success'));
          this.router.navigate(['/cuentas', res.id]);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.notifier.showServerError(err, this.transloco.translate('cuentas.detail.save-error'));
        },
      });
    } else {
      this.saving.set(true);
      const { cuentaActiva, forzarCambioClave, resetearIntentos } = this.editForm.value;
      this.service.update(this.entityId!, {
        cuentaActiva: cuentaActiva ?? undefined,
        forzarCambioClave: forzarCambioClave ?? undefined,
        resetearIntentos: resetearIntentos ?? false,
      }).pipe(
        switchMap(() => {
          const newRol = this.pendingRol();
          const currentRolId = this.entity()?.roles[0]?.id;
          if (!newRol || newRol.id === currentRolId) return [null];
          const assign$ = this.service.assignRol(this.entityId!, newRol.id);
          return currentRolId
            ? this.service.removeRol(this.entityId!, currentRolId).pipe(switchMap(() => assign$))
            : assign$;
        })
      ).subscribe({
        next: () => {
          this.saving.set(false);
          this.pendingRol.set(null);
          this.notifier.showSuccess(this.transloco.translate('cuentas.detail.save-success'));
          this.isEditMode.set(false);
          this.load();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.notifier.showServerError(err, this.transloco.translate('cuentas.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('cuentas.detail.confirm-delete-title'),
        message: this.transloco.translate('cuentas.detail.confirm-delete-message'),
        confirmText: this.transloco.translate('cuentas.detail.confirm-delete-confirm'),
        cancelText: this.transloco.translate('cuentas.detail.confirm-delete-cancel'),
      } as ConfirmDialogData,
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.delete();
    });
  }

  private delete(): void {
    this.deleting.set(true);
    this.service.delete(this.entityId!).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notifier.showSuccess(this.transloco.translate('cuentas.detail.delete-success'));
        this.router.navigate(['/cuentas']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.notifier.showServerError(err, this.transloco.translate('cuentas.detail.delete-error'));
      },
    });
  }

  isBloqueado(): boolean {
    const data = this.entity();
    if (!data?.bloqueadoHasta) return false;
    return new Date(data.bloqueadoHasta) > new Date();
  }

  onRolSelected(rol: RolResponse | null): void {
    this.pendingRol.set(rol);
  }

  onSucursalSelected(sucursal: SucursalListItem | null): void {
    if (!sucursal || !this.entityId) return;
    this.assigningSucursal.set(true);
    this.service.assignSucursal(this.entityId, sucursal.id).subscribe({
      next: () => {
        this.assigningSucursal.set(false);
        this.notifier.showSuccess(this.transloco.translate('cuentas.sucursales.assign-success'));
        this.load();
      },
      error: (err: unknown) => {
        this.assigningSucursal.set(false);
        this.notifier.showServerError(err, this.transloco.translate('cuentas.sucursales.assign-error'));
      },
    });
  }

  removeSucursal(sucursalId: string): void {
    if (!this.entityId) return;
    this.removingSucursalId.set(sucursalId);
    this.service.removeSucursal(this.entityId, sucursalId).subscribe({
      next: () => {
        this.removingSucursalId.set(null);
        this.notifier.showSuccess(this.transloco.translate('cuentas.sucursales.remove-success'));
        this.load();
      },
      error: (err: unknown) => {
        this.removingSucursalId.set(null);
        this.notifier.showServerError(err, this.transloco.translate('cuentas.sucursales.remove-error'));
      },
    });
  }
}
