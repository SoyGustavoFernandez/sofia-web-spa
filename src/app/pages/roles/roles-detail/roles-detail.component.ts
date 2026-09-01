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
import { RolService } from '../services/rol.service';
import { RolResponse } from '../models/rol.model';

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

  private entityId: string | null = null;
  private snapshot: RolResponse | null = null;

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
      // All fields enabled when creating a new role
    } else {
      this.entityId = id;
      // For existing records: nombreRol is always read-only; others start disabled
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

  enterEditMode(): void {
    this.isEditMode.set(true);
    // For existing records: descripcion and nivelJerarquia become editable; nombreRol stays disabled
    this.form.get('descripcion')?.enable();
    this.form.get('nivelJerarquia')?.enable();
    // nombreRol remains disabled for existing records
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
      this.service.update(this.entityId!, { descripcion, nivelJerarquia }).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('roles.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
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
