import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { PageEvent } from '@angular/material/paginator';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { SesionCajaService } from '../services/sesion-caja.service';
import { SesionCaja, SesionCajaFilter, EstadoSesion } from '../models/sesion-caja.model';

@Component({
  selector: 'app-sesiones-search',
  standalone: true,
  templateUrl: './sesiones-search.component.html',
  providers: [provideTranslocoScope('sesiones-caja')],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class SesionesSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(SesionCajaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly EstadoSesion = EstadoSesion;
  readonly estadoOpciones = [EstadoSesion.Abierta, EstadoSesion.Cerrada, EstadoSesion.Cuadrada];
  readonly displayedColumns = ['sucursalNombre', 'empleadoNombre', 'fechaHoraApertura', 'fechaHoraCierre', 'montoAperturaEfectivo', 'estadoSesion'];

  readonly loading = signal(false);
  readonly showResults = signal(false);
  readonly items = signal<SesionCaja[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly form = this.fb.group({
    estadoSesion: [null as EstadoSesion | null],
    fechaInicio: [null as Date | null],
    fechaFin: [null as Date | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.puntoVenta' },
    { label: 'breadcrumbs.sesionesCaja' },
  ];

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.form.patchValue(saved.formValues as never, { emitEvent: false });
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.buscar();
    }
  }

  private buildFilters(): Omit<SesionCajaFilter, 'pageNumber' | 'pageSize'> {
    const v = this.form.value;
    return {
      estadoSesion: v.estadoSesion ?? undefined,
      fechaInicio: v.fechaInicio ? (v.fechaInicio as Date).toISOString() : undefined,
      fechaFin: v.fechaFin ? (v.fechaFin as Date).toISOString() : undefined,
    };
  }

  buscar(): void {
    this.loading.set(true);
    const filters: SesionCajaFilter = {
      ...this.buildFilters(),
      pageNumber: this.pageIndex() + 1,
      pageSize: this.pageSize(),
    };
    this.service.search(filters).subscribe({
      next: result => {
        this.items.set(result.items);
        this.totalCount.set(result.totalCount);
        this.showResults.set(true);
        this.loading.set(false);
        this.searchState.save(this.stateKey, {
          formValues: this.form.getRawValue(),
          pageIndex: this.pageIndex(),
          pageSize: this.pageSize(),
        });
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('sesionesCaja.search.search-error'));
      },
    });
  }

  limpiar(): void {
    this.form.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.buscar();
  }

  goToNew(): void {
    this.router.navigate(['/sesiones-caja/nueva']);
  }

  estadoLabel(estado: EstadoSesion): string {
    const key = EstadoSesion[estado] as 'Abierta' | 'Cerrada' | 'Cuadrada';
    return this.transloco.translate(`sesionesCaja.estado.${key}`);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'sesionesCaja');
    const headers = [
      t('table.sucursal'),
      t('table.empleado'),
      t('table.fechaApertura'),
      t('table.fechaCierre'),
      t('table.montoApertura'),
      t('fields.montoCierreDeclarado'),
      t('fields.montoCierreCalculado'),
      t('fields.diferencia'),
      t('table.estado'),
    ];
    const dateFormat = this.transloco.getActiveLang() === 'es' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm';
    const f = this.buildFilters();
    this.service.exportar({ headers, dateFormat, sucursalId: f.sucursalId, estadoSesion: f.estadoSesion, fechaInicio: f.fechaInicio, fechaFin: f.fechaFin }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('sesionesCaja.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('sesionesCaja.search.search-error')),
    });
  }
}
