import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AutocompleteInputComponent } from '@shared/components/autocomplete-input/autocomplete-input.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SucursalService } from '../services/sucursal.service';
import { SucursalDetail, EmpleadoItem } from '../models/sucursal.model';

@Component({
  selector: 'app-sucursales-detail',
  standalone: true,
  templateUrl: './sucursales-detail.component.html',
  providers: [provideTranslocoScope('sucursales')],
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
export class SucursalesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SucursalService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  private entityId: string | null = null;
  private snapshot: SucursalDetail | null = null;
  private gerenteId: string | null = null;

  readonly gerenteNombreInicial = signal<string>('');

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    direccionFisica: ['', [Validators.required, Validators.maxLength(255)]],
    numeroLicencia: ['', [Validators.required, Validators.maxLength(50)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.sucursales', route: '/sucursales' },
  ];

  readonly fetchEmpleados = (query: string): Observable<EmpleadoItem[]> =>
    this.service.searchEmpleados(query).pipe(map(r => r.items));

  readonly displayEmpleado = (e: EmpleadoItem): string => e.nombre_Completo;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.gerenteId = data.gerenteId;
        this.gerenteNombreInicial.set(data.gerenteNombre ?? '');
        this.form.patchValue({
          nombre: data.nombre,
          direccionFisica: data.direccionFisica,
          numeroLicencia: data.numeroLicencia,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('sucursales.detail.load-error'));
      },
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/sucursales']);
    } else {
      this.isEditMode.set(false);
      this.gerenteId = this.snapshot?.gerenteId ?? null;
      this.gerenteNombreInicial.set(this.snapshot?.gerenteNombre ?? '');
      this.form.patchValue({
        nombre: this.snapshot?.nombre ?? '',
        direccionFisica: this.snapshot?.direccionFisica ?? '',
        numeroLicencia: this.snapshot?.numeroLicencia ?? '',
      });
      this.form.disable();
    }
  }

  onGerenteSelected(emp: EmpleadoItem | null): void {
    this.gerenteId = emp?.id ?? null;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { nombre, direccionFisica, numeroLicencia } = this.form.value;
    const body = {
      nombre: nombre!,
      direccionFisica: direccionFisica!,
      numeroLicencia: numeroLicencia!,
      gerenteId: this.gerenteId ?? undefined,
    };

    if (this.isNew()) {
      this.service.create(body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('sucursales.detail.save-success'));
          this.router.navigate(['/sucursales']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('sucursales.detail.save-error'));
        },
      });
    } else {
      this.service.update(this.entityId!, { ...body, gerenteId: this.gerenteId }).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('sucursales.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('sucursales.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('sucursales.detail.delete-confirm-title'),
        message: this.transloco.translate('sucursales.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('sucursales.detail.delete-success'));
        this.router.navigate(['/sucursales']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('sucursales.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/sucursales/nueva']);
  }
}
