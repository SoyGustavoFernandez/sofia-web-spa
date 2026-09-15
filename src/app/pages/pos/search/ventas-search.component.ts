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
import { VentaService } from '../services/venta.service';
import { Venta, EstadoVenta } from '../models/venta.model';
import { EmpleadoService } from '../../empleados/services/empleado.service';
import { Empleado } from '../../empleados/models/empleado.model';
import { PacienteService } from '../../pacientes/services/paciente.service';
import { PacienteListItem } from '../../pacientes/models/paciente.model';

@Component({
  selector: 'app-ventas-search',
  standalone: true,
  templateUrl: './ventas-search.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class VentasSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(VentaService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly EstadoVenta = EstadoVenta;
  readonly estadoOpciones = [EstadoVenta.Completada, EstadoVenta.Anulada, EstadoVenta.Devuelta, EstadoVenta.Pendiente];

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<Venta[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empleadoOptions = signal<Empleado[]>([]);
  readonly clienteOptions = signal<PacienteListItem[]>([]);
  private selectedEmpleadoId: string | undefined;
  private selectedClienteId: string | undefined;

  readonly searchForm = this.fb.group({
    fechaInicio: [null as Date | null],
    fechaFin: [null as Date | null],
    estado: [null as EstadoVenta | null],
    empleadoNombre: [''],
    clienteNombre: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.puntoVenta' },
    { label: 'breadcrumbs.ventas', isActive: true },
  ];

  readonly displayedColumns = ['codigoVenta', 'fechaHora', 'clienteNombre', 'empleadoNombre', 'total', 'estado', 'itemsCount'];

  constructor() {
    this.searchForm.controls.empleadoNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as Empleado[] });
          this.selectedEmpleadoId = undefined;
          return this.empleadoService.search({ nombres: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.empleadoOptions.set(result.items));

    this.searchForm.controls.clienteNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as PacienteListItem[] });
          this.selectedClienteId = undefined;
          const esDocumento = /^\d+$/.test(term.trim());
          return esDocumento
            ? this.pacienteService.search({ docIdentidadGub: term.trim(), pageNumber: 1, pageSize: 20 })
            : this.pacienteService.search({ nombreApellidos: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.clienteOptions.set(result.items));
  }

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.searchForm.patchValue(saved.formValues, { emitEvent: false });
      this.selectedEmpleadoId = saved.formValues['_empleadoId'] as string | undefined;
      this.selectedClienteId = saved.formValues['_clienteId'] as string | undefined;
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  private toIsoDate(date: Date | null | undefined): string | undefined {
    return date ? new Date(date).toISOString().split('T')[0] : undefined;
  }

  displayEmpleado = (e: Empleado | string | null): string => (e && typeof e === 'object' ? e.nombre_Completo : (e ?? ''));
  displayCliente = (p: PacienteListItem | string | null): string => (p && typeof p === 'object' ? p.nombreApellidos : (p ?? ''));

  onEmpleadoSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectEmpleado(event.option.value as Empleado);
  }

  onClienteSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectCliente(event.option.value as PacienteListItem);
  }

  private selectEmpleado(empleado: Empleado): void {
    this.selectedEmpleadoId = empleado.id;
  }

  private selectCliente(cliente: PacienteListItem): void {
    this.selectedClienteId = cliente.id;
  }

  estadoLabel(estado: string): string {
    return this.transloco.translate(`pos.estado.${estado}`);
  }

  private currentFilters(): { fechaInicio?: string; fechaFin?: string; estado?: EstadoVenta; empleadoId?: string; clienteId?: string } {
    const v = this.searchForm.value;
    return {
      fechaInicio: this.toIsoDate(v.fechaInicio),
      fechaFin: this.toIsoDate(v.fechaFin),
      estado: v.estado ?? undefined,
      empleadoId: this.selectedEmpleadoId,
      clienteId: this.selectedClienteId,
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
            formValues: {
              ...this.searchForm.getRawValue(),
              _empleadoId: this.selectedEmpleadoId,
              _clienteId: this.selectedClienteId,
            },
            pageIndex: this.pageIndex(),
            pageSize: this.pageSize(),
          });
        },
        error: () => {
          this.loading.set(false);
          this.notifier.showError(this.transloco.translate('pos.ventasSearch.searchError'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.empleadoOptions.set([]);
    this.clienteOptions.set([]);
    this.selectedEmpleadoId = undefined;
    this.selectedClienteId = undefined;
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/pos/nueva']);
  }

  exportar(): void {
    const t = (key: string): string => this.transloco.translate(key, {}, 'pos');
    const headers = [
      t('ventasTable.colCodigo'),
      t('ventasTable.colFecha'),
      t('ventasTable.colCliente'),
      t('ventasTable.colEmpleado'),
      t('ventasTable.colTotal'),
      t('ventasTable.colEstado'),
      t('ventasTable.colItems'),
    ];
    const dateFormat = this.transloco.getActiveLang() === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    this.service.exportar(headers, dateFormat, this.currentFilters()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('pos.ventasSearch.exportFilename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('pos.ventasSearch.searchError')),
    });
  }
}
