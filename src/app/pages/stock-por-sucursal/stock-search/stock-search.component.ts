import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { StockService } from '../services/stock.service';
import { StockPorSucursal, StockFilters } from '../models/stock.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';

@Component({
  selector: 'app-stock-search',
  standalone: true,
  templateUrl: './stock-search.component.html',
  providers: [provideTranslocoScope('stock-por-sucursal')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class StockSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(StockService);
  private readonly sucursalService = inject(SucursalService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<StockPorSucursal[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sucursalOptions = signal<SucursalListItem[]>([]);
  readonly productoOptions = signal<MedicamentoListItem[]>([]);

  readonly searchForm = this.fb.group({
    sucursalNombre: [''],
    productoNombre: [''],
    numeroLote: [''],
    caducidadDesde: [null as Date | null],
    caducidadHasta: [null as Date | null],
    cantidadMin: [null as number | null],
    cantidadMax: [null as number | null],
    soloConStock: [true],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.inventario' },
    { label: 'breadcrumbs.stock-por-sucursal', isActive: true },
  ];

  readonly displayedColumns = [
    'sucursalNombre',
    'productoNombre',
    'numeroLote',
    'fechaCaducidad',
    'cantidadFisica',
  ];

  constructor() {
    this.searchForm.controls.sucursalNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as SucursalListItem[] });
          return this.sucursalService.search({ nombre: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.sucursalOptions.set(result.items));

    this.searchForm.controls.productoNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as MedicamentoListItem[] });
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
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  private toIsoDate(date: Date | null | undefined): string | undefined {
    return date ? new Date(date).toISOString().split('T')[0] : undefined;
  }

  selectSucursal(sucursal: SucursalListItem): void {
    this.searchForm.controls.sucursalNombre.setValue(sucursal.nombre, { emitEvent: false });
  }

  selectProducto(producto: MedicamentoListItem): void {
    this.searchForm.controls.productoNombre.setValue(producto.nombreComercial, { emitEvent: false });
  }

  private currentFilters(): StockFilters {
    const v = this.searchForm.value;
    return {
      sucursalNombre: v.sucursalNombre || undefined,
      productoNombre: v.productoNombre || undefined,
      numeroLote: v.numeroLote || undefined,
      caducidadDesde: this.toIsoDate(v.caducidadDesde),
      caducidadHasta: this.toIsoDate(v.caducidadHasta),
      cantidadMin: v.cantidadMin ?? undefined,
      cantidadMax: v.cantidadMax ?? undefined,
      soloConStock: v.soloConStock ?? true,
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
            formValues: this.searchForm.getRawValue(),
            pageIndex: this.pageIndex(),
            pageSize: this.pageSize(),
          });
        },
        error: () => {
          this.loading.set(false);
          this.notifier.showError(this.transloco.translate('stockPorSucursal.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset({ soloConStock: true });
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.sucursalOptions.set([]);
    this.productoOptions.set([]);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/stock-por-sucursal/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'stockPorSucursal');
    const headers = [
      t('table.sucursal'),
      t('table.producto'),
      t('table.numeroLote'),
      t('table.caducidad'),
      t('table.cantidad'),
    ];
    const dateFormat = this.transloco.getActiveLang() === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    this.service.exportar(headers, dateFormat, this.currentFilters()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('stockPorSucursal.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () =>
        this.notifier.showError(this.transloco.translate('stockPorSucursal.search.search-error')),
    });
  }
}
