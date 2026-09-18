import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { PageEvent } from '@angular/material/paginator';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { PresentacionVentaService } from '../services/presentacion-venta.service';
import { PresentacionVenta } from '../models/presentacion-venta.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';

@Component({
  selector: 'app-presentaciones-venta-search',
  standalone: true,
  templateUrl: './presentaciones-venta-search.component.html',
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
export class PresentacionesVentaSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(PresentacionVentaService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<PresentacionVenta[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly productoOptions = signal<MedicamentoListItem[]>([]);
  private selectedProductoId: string | undefined;

  readonly searchForm = this.fb.group({
    productoNombre: [''],
    descripcion: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.presentacionesVenta', isActive: true },
  ];

  readonly displayedColumns = ['productoNombre', 'descripcion', 'cantidadUnidadesBase', 'precioVenta'];

  constructor() {
    this.searchForm.controls.productoNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as MedicamentoListItem[] });
          this.selectedProductoId = undefined;
          return this.medicamentoService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.productoOptions.set(result.items));
  }

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.searchForm.patchValue(saved.formValues, { emitEvent: false });
      this.selectedProductoId = saved.formValues['_productoId'] as string | undefined;
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  displayProducto = (p: MedicamentoListItem | string | null): string => (p && typeof p === 'object' ? p.nombreComercial : (p ?? ''));

  onProductoSelected(event: MatAutocompleteSelectedEvent): void {
    const producto = event.option.value as MedicamentoListItem;
    this.selectedProductoId = producto.id;
  }

  private currentFilters(): { productoId?: string; productoNombre?: string; descripcion?: string } {
    const { productoNombre, descripcion } = this.searchForm.value;
    return {
      productoId: this.selectedProductoId,
      productoNombre: this.selectedProductoId ? undefined : (productoNombre ?? undefined),
      descripcion: descripcion ?? undefined,
    };
  }

  search(): void {
    this.loading.set(true);
    this.service
      .search({
        ...this.currentFilters(),
        pageNumber: this.pageIndex() + 1,
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.totalCount.set(result.totalCount);
          this.showResults.set(true);
          this.loading.set(false);
          this.searchState.save(this.stateKey, {
            formValues: { ...this.searchForm.getRawValue(), _productoId: this.selectedProductoId },
            pageIndex: this.pageIndex(),
            pageSize: this.pageSize(),
          });
        },
        error: () => {
          this.loading.set(false);
          this.notifier.showError(this.transloco.translate('presentacionesVenta.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.productoOptions.set([]);
    this.selectedProductoId = undefined;
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/presentaciones-venta/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'presentacionesVenta');
    const headers = [t('table.producto'), t('table.descripcion'), t('table.cantidadUnidadesBase'), t('table.precioVenta')];
    const { productoNombre, descripcion } = this.currentFilters();
    this.service.exportar(headers, { productoNombre, descripcion }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('presentacionesVenta.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('presentacionesVenta.search.search-error')),
    });
  }
}
