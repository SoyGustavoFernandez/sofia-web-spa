import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { JerarquiaUoMService } from '../services/jerarquia-uom.service';
import { JerarquiaUoM } from '../models/jerarquia-uom.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { UnidadMedidaService } from '../../unidades-medida/services/unidad-medida.service';
import { UnidadMedidaListItem } from '../../unidades-medida/models/unidad-medida.model';

interface Ref {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-jerarquias-detail',
  standalone: true,
  templateUrl: './jerarquias-detail.component.html',
  providers: [provideTranslocoScope('jerarquias')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class JerarquiasDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(JerarquiaUoMService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly productoOptions = signal<MedicamentoListItem[]>([]);
  readonly mayorOptions = signal<UnidadMedidaListItem[]>([]);
  readonly menorOptions = signal<UnidadMedidaListItem[]>([]);

  readonly selectedProducto = signal<Ref | null>(null);
  readonly selectedMayor = signal<Ref | null>(null);
  readonly selectedMenor = signal<Ref | null>(null);
  readonly productoTouched = signal(false);
  readonly mayorTouched = signal(false);
  readonly menorTouched = signal(false);

  readonly sameUnidad = computed(
    () => !!this.selectedMayor() && this.selectedMayor()!.id === this.selectedMenor()?.id,
  );

  readonly productoCtrl = new FormControl('');
  readonly mayorCtrl = new FormControl('');
  readonly menorCtrl = new FormControl('');

  private entityId: string | null = null;
  private snapshot: JerarquiaUoM | null = null;

  readonly form = this.fb.group({
    multiplicador: [null as number | null, [Validators.required, Validators.min(0.0001)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.jerarquias', route: '/jerarquias' },
  ];

  constructor() {
    this.productoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string') return of({ items: [] as MedicamentoListItem[] });
          return this.medicamentoService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.productoOptions.set(result.items));

    this.mayorCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
          return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.mayorOptions.set(result.items));

    this.menorCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
          return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.menorOptions.set(result.items));
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
      this.mayorCtrl.disable();
      this.menorCtrl.disable();
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
        this.notifier.showError(this.transloco.translate('jerarquias.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot;
    if (!s) return;
    this.form.patchValue({ multiplicador: s.multiplicador });
    this.selectedProducto.set({ id: s.productoId, nombre: s.productoNombre });
    this.selectedMayor.set({ id: s.unidadMayorId, nombre: s.unidadMayorNombre });
    this.selectedMenor.set({ id: s.unidadMenorId, nombre: s.unidadMenorNombre });
    this.productoCtrl.setValue(s.productoNombre, { emitEvent: false });
    this.mayorCtrl.setValue(s.unidadMayorNombre, { emitEvent: false });
    this.menorCtrl.setValue(s.unidadMenorNombre, { emitEvent: false });
  }

  selectProducto(p: MedicamentoListItem): void {
    this.selectedProducto.set({ id: p.id, nombre: p.nombreComercial });
    this.productoCtrl.setValue(p.nombreComercial, { emitEvent: false });
  }

  selectMayor(u: UnidadMedidaListItem): void {
    this.selectedMayor.set({ id: u.id, nombre: u.descripcion });
    this.mayorCtrl.setValue(u.descripcion, { emitEvent: false });
  }

  selectMenor(u: UnidadMedidaListItem): void {
    this.selectedMenor.set({ id: u.id, nombre: u.descripcion });
    this.menorCtrl.setValue(u.descripcion, { emitEvent: false });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    this.productoCtrl.enable();
    this.mayorCtrl.enable();
    this.menorCtrl.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/jerarquias']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
    this.productoCtrl.disable();
    this.mayorCtrl.disable();
    this.menorCtrl.disable();
    this.productoTouched.set(false);
    this.mayorTouched.set(false);
    this.menorTouched.set(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.productoTouched.set(true);
    this.mayorTouched.set(true);
    this.menorTouched.set(true);

    if (this.productoCtrl.value !== this.selectedProducto()?.nombre) this.selectedProducto.set(null);
    if (this.mayorCtrl.value !== this.selectedMayor()?.nombre) this.selectedMayor.set(null);
    if (this.menorCtrl.value !== this.selectedMenor()?.nombre) this.selectedMenor.set(null);

    if (
      this.form.invalid ||
      !this.selectedProducto() ||
      !this.selectedMayor() ||
      !this.selectedMenor() ||
      this.sameUnidad()
    ) {
      return;
    }

    this.saving.set(true);
    const body = {
      productoId: this.selectedProducto()!.id,
      unidadMayorId: this.selectedMayor()!.id,
      unidadMenorId: this.selectedMenor()!.id,
      multiplicador: this.form.value.multiplicador!,
    };

    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('jerarquias.detail.save-success'));
      this.router.navigate(['/jerarquias']);
    };
    const fail = (): void => {
      this.saving.set(false);
      this.notifier.showError(this.transloco.translate('jerarquias.detail.save-error'));
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
        title: this.transloco.translate('jerarquias.detail.delete-confirm-title'),
        message: this.transloco.translate('jerarquias.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('jerarquias.detail.delete-success'));
        this.router.navigate(['/jerarquias']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'jerarquias.detail.delete-in-use'
            : 'jerarquias.detail.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }
}
