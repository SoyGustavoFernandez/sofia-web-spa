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
import { EmpleadoService } from '../services/empleado.service';
import { Empleado } from '../models/empleado.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';

@Component({
  selector: 'app-empleados-search',
  standalone: true,
  templateUrl: './empleados-search.component.html',
  providers: [provideTranslocoScope('empleados')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class EmpleadosSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(EmpleadoService);
  private readonly sucursalService = inject(SucursalService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<Empleado[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sucursalOptions = signal<SucursalListItem[]>([]);

  readonly searchForm = this.fb.group({
    nombres: [''],
    apellidoPaterno: [''],
    apellidoMaterno: [''],
    licencia: [''],
    sucursalNombre: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.empleados', isActive: true },
  ];

  readonly displayedColumns = ['nombreCompleto', 'apellidoPaterno', 'apellidoMaterno', 'licencia', 'sucursal'];

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

  selectSucursal(sucursal: SucursalListItem): void {
    this.searchForm.controls.sucursalNombre.setValue(sucursal.nombre, { emitEvent: false });
  }

  search(): void {
    this.loading.set(true);
    const { nombres, apellidoPaterno, apellidoMaterno, licencia, sucursalNombre } = this.searchForm.value;
    this.service
      .search({
        nombres: nombres ?? undefined,
        apellidoPaterno: apellidoPaterno ?? undefined,
        apellidoMaterno: apellidoMaterno ?? undefined,
        licencia: licencia ?? undefined,
        sucursalNombre: sucursalNombre ?? undefined,
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
          this.notifier.showError(this.transloco.translate('empleados.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.sucursalOptions.set([]);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/empleados/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'empleados');
    const headers = [
      t('table.nombres'),
      t('table.apellidoPaterno'),
      t('table.apellidoMaterno'),
      t('table.licencia'),
      t('table.sucursal'),
    ];
    const { nombres, apellidoPaterno, apellidoMaterno, licencia, sucursalNombre } = this.searchForm.value;
    this.service
      .exportar(headers, {
        nombres: nombres ?? undefined,
        apellidoPaterno: apellidoPaterno ?? undefined,
        apellidoMaterno: apellidoMaterno ?? undefined,
        licencia: licencia ?? undefined,
        sucursalNombre: sucursalNombre ?? undefined,
      })
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.transloco.translate('empleados.search.export-filename');
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notifier.showError(this.transloco.translate('empleados.search.search-error')),
      });
  }
}
