import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { PresentacionVentaService } from '../services/presentacion-venta.service';
import { PresentacionVenta } from '../models/presentacion-venta.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { JerarquiaUoMService } from '../../jerarquias/services/jerarquia-uom.service';
import { UnidadVendible } from '../../jerarquias/models/jerarquia-uom.model';

interface Ref {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-presentaciones-venta-detail',
  standalone: true,
  templateUrl: './presentaciones-venta-detail.component.html',
  providers: [provideTranslocoScope('presentaciones-venta')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class PresentacionesVentaDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PresentacionVentaService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly jerarquiaService = inject(JerarquiaUoMService);
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
  readonly unidadBaseNombre = signal('');

  readonly loadingUnidades = signal(false);
  readonly unidadesVendibles = signal<UnidadVendible[]>([]);
  readonly unidadVentaCtrl = new FormControl<string | null>(null, Validators.required);

  readonly productoCtrl = new FormControl('');

  private entityId: string | null = null;
  readonly snapshot = signal<PresentacionVenta | null>(null);

  readonly form = this.fb.group({
    precioVenta: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.presentacionesVenta', route: '/presentaciones-venta' },
  ];

  constructor() {
    this.productoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string') return of({ items: [] as MedicamentoListItem[] });
          if (this.isNew()) this.selectedProducto.set(null);
          return this.medicamentoService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.productoOptions.set(result.items));
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
      this.unidadVentaCtrl.disable();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot.set(data);
        this.applySnapshot();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('presentacionesVenta.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot();
    if (!s) return;
    this.form.patchValue({ precioVenta: s.precioVenta });
    this.selectedProducto.set({ id: s.productoId, nombre: s.productoNombre });
    this.productoCtrl.setValue(s.productoNombre, { emitEvent: false });
    this.unidadVentaCtrl.setValue(s.unidadVentaId, { emitEvent: false });
  }

  displayProducto = (p: MedicamentoListItem | string | null): string => (p && typeof p === 'object' ? p.nombreComercial : (p ?? ''));

  onProductoSelected(event: MatAutocompleteSelectedEvent): void {
    const producto = event.option.value as MedicamentoListItem;
    this.selectedProducto.set({ id: producto.id, nombre: producto.nombreComercial });
    this.unidadBaseNombre.set(producto.unidadBaseNombre);
    this.unidadVentaCtrl.setValue(null);
    this.cargarUnidadesVendibles(producto.id);
  }

  private cargarUnidadesVendibles(productoId: string): void {
    this.loadingUnidades.set(true);
    this.jerarquiaService.getUnidadesVendibles(productoId).subscribe({
      next: unidades => {
        this.unidadesVendibles.set(unidades);
        this.loadingUnidades.set(false);
      },
      error: () => {
        this.loadingUnidades.set(false);
        this.unidadesVendibles.set([]);
      },
    });
  }

  irAJerarquias(): void {
    this.router.navigate(['/jerarquias/nueva']);
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    this.unidadVentaCtrl.enable();
    // The producto can only be chosen once, at creation — a presentation always belongs to the same product.
    const snapshot = this.snapshot();
    if (this.isNew()) {
      this.productoCtrl.enable();
    } else if (snapshot) {
      this.medicamentoService.getById(snapshot.productoId).subscribe(producto => this.unidadBaseNombre.set(producto.unidadBaseNombre));
      this.cargarUnidadesVendibles(snapshot.productoId);
    }
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/presentaciones-venta']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
    this.productoCtrl.disable();
    this.unidadVentaCtrl.disable();
    this.productoTouched.set(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.unidadVentaCtrl.markAsTouched();
    this.productoTouched.set(true);

    if (this.form.invalid || this.unidadVentaCtrl.invalid || !this.selectedProducto()) {
      return;
    }

    this.saving.set(true);

    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('presentacionesVenta.detail.save-success'));
      this.router.navigate(['/presentaciones-venta']);
    };
    const fail = (err: unknown): void => {
      this.saving.set(false);
      const key =
        err instanceof HttpErrorResponse && err.status === 409
          ? 'presentacionesVenta.detail.unidad-duplicada'
          : 'presentacionesVenta.detail.save-error';
      this.notifier.showError(this.transloco.translate(key));
    };

    if (this.isNew()) {
      this.service
        .create({
          productoId: this.selectedProducto()!.id,
          unidadVentaId: this.unidadVentaCtrl.value!,
          precioVenta: this.form.value.precioVenta!,
        })
        .subscribe({ next: done, error: fail });
    } else {
      this.service
        .update(this.entityId!, {
          unidadVentaId: this.unidadVentaCtrl.value!,
          precioVenta: this.form.value.precioVenta!,
        })
        .subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('presentacionesVenta.detail.delete-confirm-title'),
        message: this.transloco.translate('presentacionesVenta.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('presentacionesVenta.detail.delete-success'));
        this.router.navigate(['/presentaciones-venta']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'presentacionesVenta.detail.delete-in-use'
            : 'presentacionesVenta.detail.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }
}
