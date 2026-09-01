import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { ProveedorService } from '../services/proveedor.service';
import { ProveedorDetail } from '../models/proveedor.model';

@Component({
  selector: 'app-proveedores-detail',
  standalone: true,
  templateUrl: './proveedores-detail.component.html',
  providers: [provideTranslocoScope('proveedores')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class ProveedoresDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProveedorService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  private entityId: string | null = null;
  private snapshot: ProveedorDetail | null = null;

  readonly form = this.fb.group({
    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
    taxId: ['', [Validators.required, Validators.maxLength(30)]],
    terminosFinancieros: [null as string | null, [Validators.maxLength(500)]],
    calificacionEsg: [null as number | null, [Validators.min(0), Validators.max(100)]],
    tasaCumplimiento: [100 as number, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.proveedores', route: '/proveedores' },
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
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.form.patchValue({
          razonSocial: data.razonSocial,
          taxId: data.taxId,
          terminosFinancieros: data.terminosFinancieros,
          calificacionEsg: data.calificacionEsg,
          tasaCumplimiento: data.tasaCumplimiento,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('proveedores.detail.load-error'));
      },
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/proveedores']);
    } else {
      this.isEditMode.set(false);
      this.form.patchValue({
        razonSocial: this.snapshot?.razonSocial ?? '',
        taxId: this.snapshot?.taxId ?? '',
        terminosFinancieros: this.snapshot?.terminosFinancieros ?? null,
        calificacionEsg: this.snapshot?.calificacionEsg ?? null,
        tasaCumplimiento: this.snapshot?.tasaCumplimiento ?? 100,
      });
      this.form.disable();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { razonSocial, taxId, terminosFinancieros, calificacionEsg, tasaCumplimiento } = this.form.value;
    if (this.isNew()) {
      this.service.create({
        razonSocial: razonSocial!,
        taxId: taxId!,
        terminosFinancieros: terminosFinancieros ?? undefined,
        calificacionEsg: calificacionEsg ?? undefined,
        tasaCumplimiento: tasaCumplimiento!,
      }).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('proveedores.detail.save-success'));
          this.router.navigate(['/proveedores']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('proveedores.detail.save-error'));
        },
      });
    } else {
      // UpdateProveedorRequest includes id in the body
      this.service.update(this.entityId!, {
        id: this.entityId!,
        razonSocial: razonSocial!,
        taxId: taxId!,
        terminosFinancieros: terminosFinancieros ?? undefined,
        calificacionEsg: calificacionEsg ?? undefined,
        tasaCumplimiento: tasaCumplimiento!,
      }).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('proveedores.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('proveedores.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('proveedores.detail.delete-confirm-title'),
        message: this.transloco.translate('proveedores.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('proveedores.detail.delete-success'));
        this.router.navigate(['/proveedores']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('proveedores.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/proveedores/nueva']);
  }
}
