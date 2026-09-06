import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, switchMap, of, map } from 'rxjs';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { RolService } from '../services/rol.service';
import { RolResponse, PermisoCatalogGroup, PermisoRolDto, SucursalRolItem, MENU_CATALOG } from '../models/rol.model';

@Component({
  selector: 'app-roles-detail',
  standalone: true,
  templateUrl: './roles-detail.component.html',
  providers: [provideTranslocoScope('roles')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class RolesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RolService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly loadingPermisos = signal(false);
  readonly loadingSucursales = signal(false);

  private entityId: string | null = null;
  private snapshot: RolResponse | null = null;
  private permisosSnapshot: PermisoRolDto[] = [];
  private sucursalesSnapshot: SucursalRolItem[] = [];

  readonly permisosCatalog = signal<PermisoCatalogGroup[]>([]);
  readonly permisosActivos = signal<PermisoRolDto[]>([]);
  readonly sucursales = signal<SucursalRolItem[]>([]);

  readonly menuPreview = computed(() => {
    const activos = this.permisosActivos();
    const hasAccess = (modules: string[]) =>
      modules.length === 0 || modules.some(m => activos.some(p => p.moduloSistema === m));
    return MENU_CATALOG.map(group => ({
      label: group.label,
      items: group.items.map(item => ({ ...item, visible: hasAccess(item.modules) })),
    }));
  });

  // nombreRol is editable only when creating; for existing records it is always disabled
  readonly form = this.fb.group({
    nombreRol: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [null as string | null, [Validators.maxLength(255)]],
    nivelJerarquia: [0 as number, [Validators.required, Validators.min(1)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.roles', route: '/roles' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.load();
      this.loadPermisos();
      this.loadSucursales();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.form.patchValue({
          nombreRol: data.nombreRol,
          descripcion: data.descripcion,
          nivelJerarquia: data.nivelJerarquia,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('roles.detail.load-error'));
      },
    });
  }

  private loadSucursales(): void {
    this.loadingSucursales.set(true);
    this.service.getSucursales(this.entityId!).subscribe({
      next: data => {
        this.sucursales.set(data);
        this.sucursalesSnapshot = data.map(s => ({ ...s }));
        this.loadingSucursales.set(false);
      },
      error: (err: unknown) => {
        this.loadingSucursales.set(false);
        this.notifier.showServerError(err, this.transloco.translate('roles.configuracion.sucursales-load-error'));
      },
    });
  }

  toggleSucursal(id: string): void {
    this.sucursales.update(list =>
      list.map(s => s.id === id ? { ...s, asignada: !s.asignada } : s));
  }

  private loadPermisos(): void {
    this.loadingPermisos.set(true);
    forkJoin([
      this.service.getPermissionsCatalog(),
      this.service.getPermisos(this.entityId!),
    ]).subscribe({
      next: ([catalog, activos]) => {
        this.permisosCatalog.set(catalog);
        this.permisosActivos.set(activos);
        this.permisosSnapshot = [...activos];
        this.loadingPermisos.set(false);
      },
      error: (err: unknown) => {
        this.loadingPermisos.set(false);
        this.notifier.showServerError(err, this.transloco.translate('roles.permisos.load-error'));
      },
    });
  }

  isPermisoActivo(modulo: string, accion: string): boolean {
    return this.permisosActivos().some(p => p.moduloSistema === modulo && p.accion === accion);
  }

  areAllSelected(modulo: string, acciones: string[]): boolean {
    return acciones.every(a => this.isPermisoActivo(modulo, a));
  }

  areSomeSelected(modulo: string, acciones: string[]): boolean {
    return acciones.some(a => this.isPermisoActivo(modulo, a));
  }

  countSelected(modulo: string, acciones: string[]): number {
    return acciones.filter(a => this.isPermisoActivo(modulo, a)).length;
  }

  togglePermiso(modulo: string, accion: string): void {
    const current = this.permisosActivos();
    const existing = current.find(p => p.moduloSistema === modulo && p.accion === accion);
    if (existing) {
      this.permisosActivos.set(current.filter(p => !(p.moduloSistema === modulo && p.accion === accion)));
    } else {
      this.permisosActivos.set([...current, { id: '', moduloSistema: modulo, accion }]);
    }
  }

  toggleModulo(modulo: string, acciones: string[]): void {
    if (this.areAllSelected(modulo, acciones)) {
      this.permisosActivos.set(this.permisosActivos().filter(p => p.moduloSistema !== modulo));
    } else {
      const missing = acciones.filter(a => !this.isPermisoActivo(modulo, a));
      this.permisosActivos.set([
        ...this.permisosActivos(),
        ...missing.map(a => ({ id: '', moduloSistema: modulo, accion: a })),
      ]);
    }
  }

  private buildPermisosObs() {
    const current = this.permisosActivos();
    const toAssign = current.filter(
      c => !this.permisosSnapshot.some(s => s.moduloSistema === c.moduloSistema && s.accion === c.accion)
    );
    const toRevoke = this.permisosSnapshot.filter(
      s => !current.some(c => c.moduloSistema === s.moduloSistema && c.accion === s.accion)
    );
    if (toAssign.length === 0 && toRevoke.length === 0) return of(undefined);
    return forkJoin([
      ...toAssign.map(p => this.service.assignPermiso(this.entityId!, p.moduloSistema, p.accion)),
      ...toRevoke.map(p => this.service.revokePermiso(p.id)),
    ]).pipe(map(() => undefined));
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.get('descripcion')?.enable();
    this.form.get('nivelJerarquia')?.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/roles']);
    } else {
      this.isEditMode.set(false);
      this.form.patchValue({
        nombreRol: this.snapshot?.nombreRol ?? '',
        descripcion: this.snapshot?.descripcion ?? null,
        nivelJerarquia: this.snapshot?.nivelJerarquia ?? 0,
      });
      this.form.disable();
      this.sucursales.set(this.sucursalesSnapshot.map(s => ({ ...s })));
      this.permisosActivos.set([...this.permisosSnapshot]);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const nombreRol = this.form.get('nombreRol')?.value ?? '';
    const descripcion = this.form.get('descripcion')?.value ?? null;
    const nivelJerarquia = this.form.get('nivelJerarquia')?.value ?? 1;

    if (this.isNew()) {
      this.service.create({ nombreRol, descripcion: descripcion ?? undefined, nivelJerarquia }).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('roles.detail.save-success'));
          this.router.navigate(['/roles']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('roles.detail.save-error'));
        },
      });
    } else {
      const ids = this.sucursales().filter(s => s.asignada).map(s => s.id);
      this.service.update(this.entityId!, { descripcion, nivelJerarquia }).pipe(
        switchMap(() => this.service.setSucursales(this.entityId!, ids)),
        switchMap(() => this.buildPermisosObs())
      ).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('roles.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
          this.loadSucursales();
          this.loadPermisos();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('roles.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('roles.detail.delete-confirm-title'),
        message: this.transloco.translate('roles.detail.delete-confirm-message'),
      } as ConfirmDialogData,
      width: '400px',
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.delete();
    });
  }

  private delete(): void {
    this.deleting.set(true);
    this.service.delete(this.entityId!).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('roles.detail.delete-success'));
        this.router.navigate(['/roles']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('roles.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/roles/nueva']);
  }
}
