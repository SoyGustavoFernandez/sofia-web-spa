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
import { PacienteService } from '../services/paciente.service';
import { PacienteDetail } from '../models/paciente.model';

@Component({
  selector: 'app-pacientes-detail',
  standalone: true,
  templateUrl: './pacientes-detail.component.html',
  providers: [provideTranslocoScope('pacientes')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class PacientesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PacienteService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  private entityId: string | null = null;
  private snapshot: PacienteDetail | null = null;

  readonly form = this.fb.group({
    docIdentidadGub: ['', [Validators.required, Validators.maxLength(20)]],
    nombreApellidos: ['', [Validators.required, Validators.maxLength(200)]],
    // fechaNacimiento holds a Date object for mat-datepicker; convert to ISO string before saving
    fechaNacimiento: [null as Date | null, [Validators.required]],
    contactoPrimario: [null as string | null, [Validators.maxLength(150)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientes-atencion' },
    { label: 'breadcrumbs.pacientes', route: '/pacientes' },
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
          docIdentidadGub: data.docIdentidadGub,
          nombreApellidos: data.nombreApellidos,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
          contactoPrimario: data.contactoPrimario,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('pacientes.detail.load-error'));
      },
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/pacientes']);
    } else {
      this.isEditMode.set(false);
      this.form.patchValue({
        docIdentidadGub: this.snapshot?.docIdentidadGub ?? '',
        nombreApellidos: this.snapshot?.nombreApellidos ?? '',
        fechaNacimiento: this.snapshot?.fechaNacimiento ? new Date(this.snapshot.fechaNacimiento) : null,
        contactoPrimario: this.snapshot?.contactoPrimario ?? null,
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
    const { docIdentidadGub, nombreApellidos, fechaNacimiento, contactoPrimario } = this.form.value;
    const fechaIso = fechaNacimiento ? fechaNacimiento.toISOString().split('T')[0] : '';
    const body = {
      docIdentidadGub: docIdentidadGub!,
      nombreApellidos: nombreApellidos!,
      fechaNacimiento: fechaIso,
      contactoPrimario: contactoPrimario ?? undefined,
    };
    if (this.isNew()) {
      this.service.create(body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('pacientes.detail.save-success'));
          this.router.navigate(['/pacientes']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('pacientes.detail.save-error'));
        },
      });
    } else {
      this.service.update(this.entityId!, body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('pacientes.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('pacientes.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('pacientes.detail.delete-confirm-title'),
        message: this.transloco.translate('pacientes.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('pacientes.detail.delete-success'));
        this.router.navigate(['/pacientes']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('pacientes.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/pacientes/nueva']);
  }
}
