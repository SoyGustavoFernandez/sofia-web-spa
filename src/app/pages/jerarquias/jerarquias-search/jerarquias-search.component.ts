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
import { RangeSliderFieldComponent } from '@shared/components/range-slider-field/range-slider-field.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { JerarquiaUoMService } from '../services/jerarquia-uom.service';
import { JerarquiaUoM } from '../models/jerarquia-uom.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { UnidadMedidaService } from '../../unidades-medida/services/unidad-medida.service';
import { UnidadMedidaListItem } from '../../unidades-medida/models/unidad-medida.model';

@Component({
  selector: 'app-jerarquias-search',
  standalone: true,
  templateUrl: './jerarquias-search.component.html',
  providers: [provideTranslocoScope('jerarquias')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
    RangeSliderFieldComponent,
  ],
})
export class JerarquiasSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(JerarquiaUoMService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly MULT_MIN = 0;
  readonly MULT_MAX = 1000;

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<JerarquiaUoM[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly productoOptions = signal<MedicamentoListItem[]>([]);
  readonly unidadMayorOptions = signal<UnidadMedidaListItem[]>([]);
  readonly unidadMenorOptions = signal<UnidadMedidaListItem[]>([]);
  readonly multMin = signal(this.MULT_MIN);
  readonly multMax = signal(this.MULT_MAX);

  readonly searchForm = this.fb.group({
    productoNombre: [''],
    unidadMayorNombre: [''],
    unidadMenorNombre: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.jerarquias', isActive: true },
  ];

  readonly displayedColumns = ['productoNombre', 'unidadMayorNombre', 'unidadMenorNombre', 'multiplicador'];

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

    this.searchForm.controls.unidadMayorNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
          return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.unidadMayorOptions.set(result.items));

    this.searchForm.controls.unidadMenorNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
          return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.unidadMenorOptions.set(result.items));
  }

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      const fv = saved.formValues as { multMin?: number; multMax?: number };
      this.searchForm.patchValue(saved.formValues, { emitEvent: false });
      this.multMin.set(fv.multMin ?? this.MULT_MIN);
      this.multMax.set(fv.multMax ?? this.MULT_MAX);
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  selectProducto(producto: MedicamentoListItem): void {
    this.searchForm.controls.productoNombre.setValue(producto.nombreComercial, { emitEvent: false });
  }

  selectUnidadMayor(unidad: UnidadMedidaListItem): void {
    this.searchForm.controls.unidadMayorNombre.setValue(unidad.descripcion, { emitEvent: false });
  }

  selectUnidadMenor(unidad: UnidadMedidaListItem): void {
    this.searchForm.controls.unidadMenorNombre.setValue(unidad.descripcion, { emitEvent: false });
  }

  search(): void {
    this.loading.set(true);
    const { productoNombre, unidadMayorNombre, unidadMenorNombre } = this.searchForm.value;
    const multMinActive = this.multMin() > this.MULT_MIN;
    const multMaxActive = this.multMax() < this.MULT_MAX;
    this.service
      .search({
        productoNombre: productoNombre ?? undefined,
        unidadMayorNombre: unidadMayorNombre ?? undefined,
        unidadMenorNombre: unidadMenorNombre ?? undefined,
        multiplicadorMin: multMinActive ? this.multMin() : undefined,
        multiplicadorMax: multMaxActive ? this.multMax() : undefined,
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
            formValues: { ...this.searchForm.getRawValue(), multMin: this.multMin(), multMax: this.multMax() },
            pageIndex: this.pageIndex(),
            pageSize: this.pageSize(),
          });
        },
        error: () => {
          this.loading.set(false);
          this.notifier.showError(this.transloco.translate('jerarquias.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.multMin.set(this.MULT_MIN);
    this.multMax.set(this.MULT_MAX);
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.productoOptions.set([]);
    this.unidadMayorOptions.set([]);
    this.unidadMenorOptions.set([]);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/jerarquias/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'jerarquias');
    const headers = [
      t('table.producto'),
      t('table.unidadMayor'),
      t('table.unidadMenor'),
      t('table.multiplicador'),
    ];
    const { productoNombre, unidadMayorNombre, unidadMenorNombre } = this.searchForm.value;
    const multMinActive = this.multMin() > this.MULT_MIN;
    const multMaxActive = this.multMax() < this.MULT_MAX;
    this.service
      .exportar(headers, {
        productoNombre: productoNombre ?? undefined,
        unidadMayorNombre: unidadMayorNombre ?? undefined,
        unidadMenorNombre: unidadMenorNombre ?? undefined,
        multiplicadorMin: multMinActive ? this.multMin() : undefined,
        multiplicadorMax: multMaxActive ? this.multMax() : undefined,
      })
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.transloco.translate('jerarquias.search.export-filename');
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notifier.showError(this.transloco.translate('jerarquias.search.search-error')),
      });
  }
}
