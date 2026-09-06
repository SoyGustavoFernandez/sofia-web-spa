import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
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
import { MedicamentoService } from '../services/medicamento.service';
import { MedicamentoDetail } from '../models/medicamento.model';
import { LaboratorioService } from '../../laboratorios/services/laboratorio.service';
import { LaboratorioListItem } from '../../laboratorios/models/laboratorio.model';
import { UnidadMedidaService } from '../../unidades-medida/services/unidad-medida.service';
import { UnidadMedidaListItem } from '../../unidades-medida/models/unidad-medida.model';

@Component({
  selector: 'app-medicamentos-detail',
  standalone: true,
  templateUrl: './medicamentos-detail.component.html',
  providers: [provideTranslocoScope('medicamentos')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class MedicamentosDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(MedicamentoService);
  private readonly labService = inject(LaboratorioService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly condicionOptions = signal<string[]>([]);
  readonly labOptions = signal<LaboratorioListItem[]>([]);
  readonly unidadOptions = signal<UnidadMedidaListItem[]>([]);

  readonly selectedLab = signal<LaboratorioListItem | null>(null);
  readonly selectedUnidad = signal<UnidadMedidaListItem | null>(null);
  readonly labTouched = signal(false);
  readonly unidadTouched = signal(false);

  readonly labSearchCtrl = new FormControl('');
  readonly unidadSearchCtrl = new FormControl('');

  private entityId: string | null = null;
  snapshot: MedicamentoDetail | null = null;
  private snapshotLab: LaboratorioListItem | null = null;
  private snapshotUnidad: UnidadMedidaListItem | null = null;

  readonly form = this.fb.group({
    codigoNacional: ['', [Validators.required, Validators.maxLength(50)]],
    nombreComercial: ['', [Validators.required, Validators.maxLength(150)]],
    condicionVenta: [null as number | null, Validators.required],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.medicamentos', route: '/medicamentos' },
  ];

  constructor() {
    this.labSearchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (typeof term !== 'string') return of({ items: [] as LaboratorioListItem[] });
        return this.labService.search({ nombreCompania: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.labOptions.set(result.items));

    this.unidadSearchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
        return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.unidadOptions.set(result.items));
  }

  ngOnInit(): void {
    this.service.getCondicionesVenta().subscribe({
      next: labels => this.condicionOptions.set(labels),
      error: () => this.notifier.showError(this.transloco.translate('medicamentos.detail.condiciones-error')),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.labSearchCtrl.disable();
      this.unidadSearchCtrl.disable();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.form.patchValue({
          codigoNacional: data.codigoNacional,
          nombreComercial: data.nombreComercial,
          condicionVenta: data.condicionVenta,
        });
        const lab: LaboratorioListItem = {
          id: data.laboratorioId,
          nombreCompania: data.laboratorioNombre,
          codigoIdentificador: null,
        };
        const unidad: UnidadMedidaListItem = {
          id: data.unidadBaseId,
          codigo: '',
          descripcion: data.unidadBaseNombre,
        };
        this.selectedLab.set(lab);
        this.snapshotLab = lab;
        this.labSearchCtrl.setValue(data.laboratorioNombre, { emitEvent: false });
        this.selectedUnidad.set(unidad);
        this.snapshotUnidad = unidad;
        this.unidadSearchCtrl.setValue(data.unidadBaseNombre, { emitEvent: false });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('medicamentos.detail.load-error'));
      },
    });
  }

  selectLab(lab: LaboratorioListItem): void {
    this.selectedLab.set(lab);
    this.labSearchCtrl.setValue(lab.nombreCompania, { emitEvent: false });
  }

  selectUnidad(unidad: UnidadMedidaListItem): void {
    this.selectedUnidad.set(unidad);
    this.unidadSearchCtrl.setValue(unidad.descripcion, { emitEvent: false });
  }

  displayLab = (lab: LaboratorioListItem | null): string => lab?.nombreCompania ?? '';
  displayUnidad = (unidad: UnidadMedidaListItem | null): string => unidad?.descripcion ?? '';

  getCondicionLabel(value: number): string {
    return this.condicionOptions()[value] ?? String(value);
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    this.labSearchCtrl.enable();
    this.unidadSearchCtrl.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/medicamentos']);
    } else {
      this.isEditMode.set(false);
      this.form.patchValue({
        codigoNacional: this.snapshot?.codigoNacional ?? '',
        nombreComercial: this.snapshot?.nombreComercial ?? '',
        condicionVenta: this.snapshot?.condicionVenta ?? null,
      });
      this.form.disable();
      this.selectedLab.set(this.snapshotLab);
      this.labSearchCtrl.setValue(this.snapshotLab?.nombreCompania ?? '', { emitEvent: false });
      this.labSearchCtrl.disable();
      this.selectedUnidad.set(this.snapshotUnidad);
      this.unidadSearchCtrl.setValue(this.snapshotUnidad?.descripcion ?? '', { emitEvent: false });
      this.unidadSearchCtrl.disable();
      this.labTouched.set(false);
      this.unidadTouched.set(false);
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    this.labTouched.set(true);
    this.unidadTouched.set(true);

    // Clear selection if text was changed without picking from dropdown
    if (this.labSearchCtrl.value !== this.selectedLab()?.nombreCompania) {
      this.selectedLab.set(null);
    }
    if (this.unidadSearchCtrl.value !== this.selectedUnidad()?.descripcion) {
      this.selectedUnidad.set(null);
    }

    if (this.form.invalid || !this.selectedLab() || !this.selectedUnidad()) {
      return;
    }

    this.saving.set(true);
    const { codigoNacional, nombreComercial, condicionVenta } = this.form.value;
    const body = {
      codigoNacional: codigoNacional!,
      nombreComercial: nombreComercial!,
      laboratorioId: this.selectedLab()!.id,
      unidadBaseId: this.selectedUnidad()!.id,
      condicionVenta: condicionVenta!,
    };

    if (this.isNew()) {
      this.service.create(body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('medicamentos.detail.save-success'));
          this.router.navigate(['/medicamentos']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('medicamentos.detail.save-error'));
        },
      });
    } else {
      this.service.update(this.entityId!, body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('medicamentos.detail.save-success'));
          this.saving.set(false);
          this.isEditMode.set(false);
          this.form.disable();
          this.labSearchCtrl.disable();
          this.unidadSearchCtrl.disable();
          this.labTouched.set(false);
          this.unidadTouched.set(false);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('medicamentos.detail.save-error'));
        },
      });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('medicamentos.detail.delete-confirm-title'),
        message: this.transloco.translate('medicamentos.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('medicamentos.detail.delete-success'));
        this.router.navigate(['/medicamentos']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('medicamentos.detail.delete-error'));
      },
    });
  }
}
