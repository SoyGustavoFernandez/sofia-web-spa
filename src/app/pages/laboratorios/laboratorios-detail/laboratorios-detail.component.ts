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
import { LaboratorioService } from '../services/laboratorio.service';
import { LaboratorioDetail } from '../models/laboratorio.model';

@Component({
  selector: 'app-laboratorios-detail',
  standalone: true,
  templateUrl: './laboratorios-detail.component.html',
  providers: [provideTranslocoScope('laboratorios')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class LaboratoriosDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(LaboratorioService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  private entityId: string | null = null;
  private snapshot: LaboratorioDetail | null = null;

  readonly form = this.fb.group({
    nombreCompania: ['', [Validators.required, Validators.maxLength(150)]],
    codigoIdentificador: [null as string | null, [Validators.maxLength(50)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.laboratorios', route: '/laboratorios' },
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
        this.form.patchValue({ nombreCompania: data.nombreCompania, codigoIdentificador: data.codigoIdentificador });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('laboratorios.detail.load-error'));
      },
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/laboratorios']);
    } else {
      this.isEditMode.set(false);
      this.form.patchValue({ nombreCompania: this.snapshot?.nombreCompania ?? '', codigoIdentificador: this.snapshot?.codigoIdentificador ?? null });
      this.form.disable();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { nombreCompania, codigoIdentificador } = this.form.value;
    const body = {
      nombreCompania: nombreCompania!,
      codigoIdentificador: codigoIdentificador ?? undefined,
    };
    if (this.isNew()) {
      this.service.create(body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('laboratorios.detail.save-success'));
          this.router.navigate(['/laboratorios']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('laboratorios.detail.save-error'));
        },
      });
    } else {
      this.service.update(this.entityId!, body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('laboratorios.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('laboratorios.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('laboratorios.detail.delete-confirm-title'),
        message: this.transloco.translate('laboratorios.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('laboratorios.detail.delete-success'));
        this.router.navigate(['/laboratorios']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('laboratorios.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/laboratorios/nueva']);
  }
}
