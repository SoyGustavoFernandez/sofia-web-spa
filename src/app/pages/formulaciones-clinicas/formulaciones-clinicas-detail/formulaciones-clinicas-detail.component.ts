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
import { FormulacionClinicaService } from '../services/formulacion-clinica.service';
import { FormulacionClinicaDetail } from '../models/formulacion-clinica.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { IngredienteActivoService } from '../../ingredientes-activos/services/ingrediente-activo.service';
import { IngredienteActivoListItem } from '../../ingredientes-activos/models/ingrediente-activo.model';
import { UnidadMedidaService } from '../../unidades-medida/services/unidad-medida.service';
import { UnidadMedidaListItem } from '../../unidades-medida/models/unidad-medida.model';

interface Ref {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-formulaciones-clinicas-detail',
  standalone: true,
  templateUrl: './formulaciones-clinicas-detail.component.html',
  providers: [provideTranslocoScope('formulacionesClinicas')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class FormulacionesClinicasDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(FormulacionClinicaService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly ingredienteService = inject(IngredienteActivoService);
  private readonly unidadMedidaService = inject(UnidadMedidaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly productoOptions = signal<MedicamentoListItem[]>([]);
  readonly selectedProducto = signal<Ref | null>(null);
  readonly productoTouched = signal(false);
  readonly productoCtrl = new FormControl('');

  readonly ingredienteOptions = signal<IngredienteActivoListItem[]>([]);
  readonly selectedIngrediente = signal<Ref | null>(null);
  readonly ingredienteTouched = signal(false);
  readonly ingredienteCtrl = new FormControl('');

  readonly unidadMedidaOptions = signal<UnidadMedidaListItem[]>([]);
  readonly selectedUnidadMedida = signal<Ref | null>(null);
  readonly unidadMedidaTouched = signal(false);
  readonly unidadMedidaCtrl = new FormControl('');

  private entityId: string | null = null;
  private snapshot: FormulacionClinicaDetail | null = null;

  readonly form = this.fb.group({
    concentracionDosis: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    codigoTeOrange: ['', [Validators.maxLength(5)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.formulaciones-clinicas', route: '/formulaciones-clinicas' },
  ];

  constructor() {
    this.productoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string' || !term) return of({ items: [] as MedicamentoListItem[] });
          return this.medicamentoService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.productoOptions.set(result.items));

    this.ingredienteCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string' || !term) return of({ items: [] as IngredienteActivoListItem[] });
          return this.ingredienteService.search({ denominacionDci: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.ingredienteOptions.set(result.items));

    this.unidadMedidaCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string' || !term) return of({ items: [] as UnidadMedidaListItem[] });
          return this.unidadMedidaService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.unidadMedidaOptions.set(result.items));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.productoCtrl.disable();
      this.ingredienteCtrl.disable();
      this.unidadMedidaCtrl.disable();
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
        this.notifier.showError(this.transloco.translate('formulacionesClinicas.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot;
    if (!s) return;
    this.form.patchValue({
      concentracionDosis: s.concentracionDosis,
      codigoTeOrange: s.codigoTeOrange ?? '',
    });
    this.selectedProducto.set({ id: s.productoId, nombre: s.productoNombre ?? '' });
    this.productoCtrl.setValue(s.productoNombre ?? '', { emitEvent: false });
    this.selectedIngrediente.set({ id: s.ingredienteId, nombre: s.ingredienteNombre ?? '' });
    this.ingredienteCtrl.setValue(s.ingredienteNombre ?? '', { emitEvent: false });
    this.selectedUnidadMedida.set({ id: s.unidadMedidaId, nombre: s.unidadMedidaNombre ?? '' });
    this.unidadMedidaCtrl.setValue(s.unidadMedidaNombre ?? '', { emitEvent: false });
  }

  selectProducto(p: MedicamentoListItem): void {
    this.selectedProducto.set({ id: p.id, nombre: p.nombreComercial });
    this.productoCtrl.setValue(p.nombreComercial, { emitEvent: false });
  }

  selectIngrediente(i: IngredienteActivoListItem): void {
    this.selectedIngrediente.set({ id: i.id, nombre: i.denominacionDci });
    this.ingredienteCtrl.setValue(i.denominacionDci, { emitEvent: false });
  }

  selectUnidadMedida(u: UnidadMedidaListItem): void {
    this.selectedUnidadMedida.set({ id: u.id, nombre: u.descripcion });
    this.unidadMedidaCtrl.setValue(u.descripcion, { emitEvent: false });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    this.ingredienteCtrl.enable();
    this.unidadMedidaCtrl.enable();
    // Producto cannot be changed once the formulation exists.
    this.productoCtrl.disable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/formulaciones-clinicas']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
    this.ingredienteCtrl.disable();
    this.unidadMedidaCtrl.disable();
    this.ingredienteTouched.set(false);
    this.unidadMedidaTouched.set(false);
  }

  private refSelectionValid(ctrl: FormControl<string | null>, selected: Ref | null): boolean {
    return !!selected && ctrl.value === selected.nombre;
  }

  save(): void {
    this.form.markAllAsTouched();
    this.productoTouched.set(true);
    this.ingredienteTouched.set(true);
    this.unidadMedidaTouched.set(true);

    if (!this.refSelectionValid(this.productoCtrl, this.selectedProducto())) {
      this.selectedProducto.set(null);
    }
    if (!this.refSelectionValid(this.ingredienteCtrl, this.selectedIngrediente())) {
      this.selectedIngrediente.set(null);
    }
    if (!this.refSelectionValid(this.unidadMedidaCtrl, this.selectedUnidadMedida())) {
      this.selectedUnidadMedida.set(null);
    }

    const productoValid = !this.isNew() || !!this.selectedProducto();
    if (this.form.invalid || !productoValid || !this.selectedIngrediente() || !this.selectedUnidadMedida()) {
      return;
    }

    this.saving.set(true);
    const v = this.form.value;
    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('formulacionesClinicas.detail.save-success'));
      this.router.navigate(['/formulaciones-clinicas']);
    };
    const fail = (err: unknown): void => {
      this.saving.set(false);
      const key =
        err instanceof HttpErrorResponse && err.status === 409
          ? 'formulacionesClinicas.detail.save-conflict'
          : 'formulacionesClinicas.detail.save-error';
      this.notifier.showError(this.transloco.translate(key));
    };

    if (this.isNew()) {
      this.service
        .create({
          productoId: this.selectedProducto()!.id,
          ingredienteId: this.selectedIngrediente()!.id,
          concentracionDosis: v.concentracionDosis!,
          unidadMedidaId: this.selectedUnidadMedida()!.id,
          codigoTeOrange: v.codigoTeOrange || undefined,
        })
        .subscribe({ next: done, error: fail });
    } else {
      this.service
        .update(this.entityId!, {
          ingredienteId: this.selectedIngrediente()!.id,
          concentracionDosis: v.concentracionDosis!,
          unidadMedidaId: this.selectedUnidadMedida()!.id,
          codigoTeOrange: v.codigoTeOrange || undefined,
        })
        .subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('formulacionesClinicas.detail.delete-confirm-title'),
        message: this.transloco.translate('formulacionesClinicas.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('formulacionesClinicas.detail.delete-success'));
        this.router.navigate(['/formulaciones-clinicas']);
      },
      error: () => {
        this.deleting.set(false);
        this.notifier.showError(this.transloco.translate('formulacionesClinicas.detail.delete-error'));
      },
    });
  }

  goToNew(): void {
    this.router.navigate(['/formulaciones-clinicas/nueva']);
  }
}
