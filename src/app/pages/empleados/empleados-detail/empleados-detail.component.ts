import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { EmpleadoService } from '../services/empleado.service';
import { Empleado } from '../models/empleado.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';

interface Ref {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-empleados-detail',
  standalone: true,
  templateUrl: './empleados-detail.component.html',
  providers: [provideTranslocoScope('empleados')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class EmpleadosDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EmpleadoService);
  private readonly sucursalService = inject(SucursalService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly sucursalOptions = signal<SucursalListItem[]>([]);
  readonly selectedSucursal = signal<Ref | null>(null);
  readonly sucursalTouched = signal(false);

  readonly sucursalCtrl = new FormControl('');

  private entityId: string | null = null;
  private snapshot: Empleado | null = null;

  readonly form = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(75)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(75)]],
    apellidoMaterno: ['', [Validators.required, Validators.maxLength(75)]],
    licencia: ['', [Validators.maxLength(50)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.empleados', route: '/empleados' },
  ];

  constructor() {
    this.sucursalCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string') return of({ items: [] as SucursalListItem[] });
          return this.sucursalService.search({ nombre: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.sucursalOptions.set(result.items));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.sucursalCtrl.disable();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.applySnapshot();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('empleados.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot;
    if (!s) return;
    this.form.patchValue({
      nombres: s.nombres,
      apellidoPaterno: s.apellido_Paterno,
      apellidoMaterno: s.apellido_Materno,
      licencia: s.licencia_Prof ?? '',
    });
    this.selectedSucursal.set({ id: s.sucursal_Base_ID, nombre: s.sucursalNombre ?? '' });
    this.sucursalCtrl.setValue(s.sucursalNombre ?? '', { emitEvent: false });
  }

  selectSucursal(s: SucursalListItem): void {
    this.selectedSucursal.set({ id: s.id, nombre: s.nombre });
    this.sucursalCtrl.setValue(s.nombre, { emitEvent: false });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    this.sucursalCtrl.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/empleados']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
    this.sucursalCtrl.disable();
    this.sucursalTouched.set(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.sucursalTouched.set(true);

    if (this.sucursalCtrl.value !== this.selectedSucursal()?.nombre) {
      this.selectedSucursal.set(null);
    }

    if (this.form.invalid || !this.selectedSucursal()) {
      return;
    }

    this.saving.set(true);
    const v = this.form.value;
    const body = {
      sucursal_Base_ID: this.selectedSucursal()!.id,
      nombres: v.nombres!,
      apellido_Paterno: v.apellidoPaterno!,
      apellido_Materno: v.apellidoMaterno!,
      licencia_Prof: v.licencia ? v.licencia : undefined,
    };

    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('empleados.detail.save-success'));
      this.router.navigate(['/empleados']);
    };
    const fail = (): void => {
      this.saving.set(false);
      this.notifier.showError(this.transloco.translate('empleados.detail.save-error'));
    };

    if (this.isNew()) {
      this.service.create(body).subscribe({ next: done, error: fail });
    } else {
      this.service.update(this.entityId!, body).subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('empleados.detail.delete-confirm-title'),
        message: this.transloco.translate('empleados.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('empleados.detail.delete-success'));
        this.router.navigate(['/empleados']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'empleados.detail.delete-manager'
            : 'empleados.detail.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }
}
