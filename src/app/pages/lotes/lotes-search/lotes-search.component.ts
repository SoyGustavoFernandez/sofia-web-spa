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
import { LoteService } from '../services/lote.service';
import { Lote } from '../models/lote.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';

@Component({
  selector: 'app-lotes-search',
  standalone: true,
  templateUrl: './lotes-search.component.html',
  providers: [provideTranslocoScope('lotes')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class LotesSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(LoteService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<Lote[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly productoOptions = signal<MedicamentoListItem[]>([]);

  readonly searchForm = this.fb.group({
    productoNombre: [''],
    numeroLote: [''],
    caducidadDesde: [null as Date | null],
    caducidadHasta: [null as Date | null],
    fabricacionDesde: [null as Date | null],
    fabricacionHasta: [null as Date | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.inventario' },
    { label: 'breadcrumbs.lotes', isActive: true },
  ];

  readonly displayedColumns = ['nombreProducto', 'numeroLoteMfr', 'fechaFabricacion', 'fechaCaducidad'];

  constructor() {
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

  selectProducto(producto: MedicamentoListItem): void {
    this.searchForm.controls.productoNombre.setValue(producto.nombreComercial, { emitEvent: false });
  }

  private currentFilters(): {
    productoNombre?: string;
    numeroLote?: string;
    caducidadDesde?: string;
    caducidadHasta?: string;
    fabricacionDesde?: string;
    fabricacionHasta?: string;
  } {
    const v = this.searchForm.value;
    return {
      productoNombre: v.productoNombre ?? undefined,
      numeroLote: v.numeroLote ?? undefined,
      caducidadDesde: this.toIsoDate(v.caducidadDesde),
      caducidadHasta: this.toIsoDate(v.caducidadHasta),
      fabricacionDesde: this.toIsoDate(v.fabricacionDesde),
      fabricacionHasta: this.toIsoDate(v.fabricacionHasta),
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
          this.notifier.showError(this.transloco.translate('lotes.search.search-error'));
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
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/lotes/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'lotes');
    const headers = [
      t('table.producto'),
      t('table.numeroLote'),
      t('table.fabricacion'),
      t('table.caducidad'),
    ];
    const dateFormat = this.transloco.getActiveLang() === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    this.service.exportar(headers, dateFormat, this.currentFilters()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('lotes.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('lotes.search.search-error')),
    });
  }
}
