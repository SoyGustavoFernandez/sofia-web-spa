import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { DateAdapter } from '@angular/material/core';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { EmpresaService } from '../services/empresa.service';
import { EmpresaDto, EstadoEmpresa, SearchEmpresaParams } from '../models/empresa.model';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-empresa-search',
  standalone: true,
  templateUrl: './empresa-search.component.html',
  providers: [provideTranslocoScope('empresa')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class EmpresaSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(EmpresaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<EmpresaDto[]>([]);
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly EstadoEmpresa = EstadoEmpresa;

  readonly searchForm = this.fb.group({
    estado: [null as EstadoEmpresa | null],
    nombre: [''],
    fechaVencimientoDesde: [null as Date | null],
    fechaVencimientoHasta: [null as Date | null],
  });

  readonly estadoOptions = [
    { value: null, label: 'empresa.fields.estadoTodos' },
    { value: EstadoEmpresa.TrialActivo, label: 'empresa.estado.TrialActivo' },
    { value: EstadoEmpresa.Activo, label: 'empresa.estado.Activo' },
    { value: EstadoEmpresa.Suspendido, label: 'empresa.estado.Suspendido' },
    { value: EstadoEmpresa.Cancelado, label: 'empresa.estado.Cancelado' },
  ];

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.empresa', isActive: true },
  ];

  readonly displayedColumns = ['nombre', 'ruc', 'estado', 'estaVigente'];

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const locale = this.transloco.getActiveLang() === 'es' ? 'es-PE' : 'en-US';
    this.dateAdapter.setLocale(locale);
    this.transloco.langChanges$.subscribe(lang => {
      this.dateAdapter.setLocale(lang === 'es' ? 'es-PE' : 'en-US');
    });

    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.searchForm.patchValue(saved.formValues);
      this.pageNumber.set(saved.pageIndex + 1);
      this.pageSize.set(saved.pageSize);
      this.search(this.pageNumber());
    }
  }

  search(page = 1): void {
    this.loading.set(true);
    this.pageNumber.set(page);
    const { estado, nombre, fechaVencimientoDesde, fechaVencimientoHasta } = this.searchForm.value;
    const params: SearchEmpresaParams = {
      nombre: nombre ?? undefined,
      estado: estado ?? undefined,
      fechaVencimientoDesde: fechaVencimientoDesde ? fechaVencimientoDesde.toISOString() : undefined,
      fechaVencimientoHasta: fechaVencimientoHasta ? fechaVencimientoHasta.toISOString() : undefined,
      pageNumber: page,
      pageSize: this.pageSize(),
    };
    this.service.search(params).subscribe({
      next: result => {
        this.items.set(result.items as EmpresaDto[]);
        this.totalCount.set(result.totalCount);
        this.showResults.set(true);
        this.loading.set(false);
        this.searchState.save(this.stateKey, {
          formValues: this.searchForm.getRawValue(),
          pageIndex: this.pageNumber() - 1,
          pageSize: this.pageSize(),
        });
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('empresa.search.search-error'));
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.search(event.pageIndex + 1);
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageNumber.set(1);
    this.searchState.clear(this.stateKey);
  }

  estadoLabel(estado: EstadoEmpresa): string {
    return this.transloco.translate(`empresa.estado.${estado}`);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'empresa');
    const { nombre, estado, fechaVencimientoDesde, fechaVencimientoHasta } = this.searchForm.value;
    const request = {
      headers: [
        t('cols.nombre'),
        t('cols.ruc'),
        t('cols.estado'),
        t('cols.estaVigente'),
        t('fields.fechaInicioTrial'),
        t('fields.fechaVencimiento'),
        t('fields.sucursalesCount'),
      ],
      yesLabel: this.transloco.translate('generic-labels.yes'),
      noLabel: this.transloco.translate('generic-labels.no'),
      nombre: nombre ?? undefined,
      estado: estado ?? undefined,
      fechaVencimientoDesde: fechaVencimientoDesde ? new Date(fechaVencimientoDesde).toISOString() : undefined,
      fechaVencimientoHasta: fechaVencimientoHasta ? new Date(fechaVencimientoHasta).toISOString() : undefined,
    };
    this.service.exportar(request).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('empresa.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('empresa.search.search-error')),
    });
  }
}
