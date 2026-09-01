import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { EmpresaService } from '../services/empresa.service';
import { EmpresaDto, EstadoEmpresa } from '../models/empresa.model';
import { EmpresaDeleteDialogComponent } from '../empresa-delete-dialog/empresa-delete-dialog.component';

@Component({
  selector: 'app-empresa-detail',
  standalone: true,
  templateUrl: './empresa-detail.component.html',
  providers: [provideTranslocoScope('empresa')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class EmpresaDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EmpresaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);

  // Empresa has no /nueva route - only edit of existing records
  readonly isNew = signal(false);

  private entityId: string | null = null;
  private snapshot: EmpresaDto | null = null;

  // Read-only display fields (not in form since they are not updatable)
  readonly estadoDisplay = signal('');
  readonly estaVigenteDisplay = signal(false);
  readonly sucursalesCountDisplay = signal(0);
  readonly fechaInicioTrialDisplay = signal('');
  readonly fechaVencimientoDisplay = signal('');

  readonly EstadoEmpresa = EstadoEmpresa;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    ruc: [null as string | null, [Validators.maxLength(20)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.empresa', route: '/empresas' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
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
        this.form.patchValue({ nombre: data.nombre, ruc: data.ruc });
        this.estadoDisplay.set(this.transloco.translate(`empresa.estado.${data.estado}`));
        this.estaVigenteDisplay.set(data.estaVigente);
        this.sucursalesCountDisplay.set(data.cantidadSucursales ?? 0);
        this.fechaInicioTrialDisplay.set(data.fechaInicioTrial);
        this.fechaVencimientoDisplay.set(data.fechaVencimiento);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('empresa.detail.load-error'));
      },
    });
  }

  onDelete(): void {
    if (!this.snapshot) return;
    const ref = this.dialog.open(EmpresaDeleteDialogComponent, {
      width: '400px',
      data: this.snapshot,
    });
    ref.afterClosed().subscribe((deleted: boolean) => {
      if (deleted) void this.router.navigate(['/empresas']);
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
    this.form.patchValue({ nombre: this.snapshot?.nombre ?? '', ruc: this.snapshot?.ruc ?? null });
    this.form.disable();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { nombre, ruc } = this.form.value;
    this.service.update(this.entityId!, { nombre: nombre!, ruc: ruc ?? null }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifier.showSuccess(this.transloco.translate('empresa.detail.save-success'));
        this.isEditMode.set(false);
        this.form.disable();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('empresa.detail.save-error'));
      },
    });
  }
}
