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
import { MedicamentoService } from '../services/medicamento.service';
import { MedicamentoListItem } from '../models/medicamento.model';
import { LaboratorioService } from '../../laboratorios/services/laboratorio.service';
import { LaboratorioListItem } from '../../laboratorios/models/laboratorio.model';
import { UnidadMedidaService } from '../../unidades-medida/services/unidad-medida.service';
import { UnidadMedidaListItem } from '../../unidades-medida/models/unidad-medida.model';

@Component({
  selector: 'app-medicamentos-search',
  standalone: true,
  templateUrl: './medicamentos-search.component.html',
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
export class MedicamentosSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(MedicamentoService);
  private readonly labService = inject(LaboratorioService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<MedicamentoListItem[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly condicionLabels = signal<string[]>([]);
  readonly labOptions = signal<LaboratorioListItem[]>([]);
  readonly unidadOptions = signal<UnidadMedidaListItem[]>([]);

  readonly searchForm = this.fb.group({
    codigoNacional: [''],
    nombreComercial: [''],
    laboratorioNombre: [''],
    unidadBaseNombre: [''],
    condicionVenta: [null as number | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.medicamentos', isActive: true },
  ];

  readonly displayedColumns = ['codigoNacional', 'nombreComercial', 'laboratorioNombre', 'unidadBaseNombre', 'condicionVenta'];

  constructor() {
    this.searchForm.controls.laboratorioNombre.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as LaboratorioListItem[] });
        return this.labService.search({ nombreCompania: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.labOptions.set(result.items));

    this.searchForm.controls.unidadBaseNombre.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as UnidadMedidaListItem[] });
        return this.unidadService.search({ descripcion: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.unidadOptions.set(result.items));
  }

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    this.service.getCondicionesVenta().subscribe({
      next: labels => this.condicionLabels.set(labels),
    });
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.searchForm.patchValue(saved.formValues, { emitEvent: false });
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  getCondicionLabel(value: number): string {
    return this.condicionLabels()[value] ?? String(value);
  }

  search(): void {
    this.loading.set(true);
    const { codigoNacional, nombreComercial, laboratorioNombre, unidadBaseNombre, condicionVenta } = this.searchForm.value;
    this.service
      .search({
        codigoNacional: codigoNacional ?? undefined,
        nombreComercial: nombreComercial ?? undefined,
        laboratorioNombre: laboratorioNombre ?? undefined,
        unidadBaseNombre: unidadBaseNombre ?? undefined,
        condicionVenta: condicionVenta ?? undefined,
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
          this.notifier.showError(this.transloco.translate('medicamentos.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.labOptions.set([]);
    this.unidadOptions.set([]);
    this.searchState.clear(this.stateKey);
  }

  selectLab(lab: LaboratorioListItem): void {
    this.searchForm.controls.laboratorioNombre.setValue(lab.nombreCompania, { emitEvent: false });
  }

  selectUnidad(unidad: UnidadMedidaListItem): void {
    this.searchForm.controls.unidadBaseNombre.setValue(unidad.descripcion, { emitEvent: false });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/medicamentos/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'medicamentos');
    const headers = [
      t('table.codigoNacional'),
      t('table.nombreComercial'),
      t('table.laboratorio'),
      t('table.unidadBase'),
      t('table.condicionVenta'),
    ];
    const { codigoNacional, nombreComercial, laboratorioNombre, unidadBaseNombre, condicionVenta } =
      this.searchForm.value;
    this.service
      .exportar(headers, {
        codigoNacional: codigoNacional ?? undefined,
        nombreComercial: nombreComercial ?? undefined,
        laboratorioNombre: laboratorioNombre ?? undefined,
        unidadBaseNombre: unidadBaseNombre ?? undefined,
        condicionVenta: condicionVenta ?? undefined,
      })
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.transloco.translate('medicamentos.search.export-filename');
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notifier.showError(this.transloco.translate('medicamentos.search.search-error')),
      });
  }
}
