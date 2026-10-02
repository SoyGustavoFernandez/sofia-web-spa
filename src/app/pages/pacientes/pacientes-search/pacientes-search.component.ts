import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { PageEvent } from '@angular/material/paginator';
import { MaterialModule } from '@shared/material.module';
import { toDateOnly } from '@shared/utils/date-only.util';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { PacienteService } from '../services/paciente.service';
import { PacienteListItem } from '../models/paciente.model';
import { TIPOS_DOCUMENTO_IDENTIDAD, tipoDocumentoKey } from '@shared/utils/tipo-documento.util';
import { PermisoDirective } from '@shared/directives/permiso.directive';

@Component({
  selector: 'app-pacientes-search',
  standalone: true,
  templateUrl: './pacientes-search.component.html',
  providers: [provideTranslocoScope('pacientes')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
    PermisoDirective,
  ],
})
export class PacientesSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(PacienteService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<PacienteListItem[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly tiposDocumento = TIPOS_DOCUMENTO_IDENTIDAD;
  readonly tipoDocumentoKey = tipoDocumentoKey;

  readonly searchForm = this.fb.group({
    tipoDocumento: [''],
    docIdentidadGub: [''],
    nombreApellidos: [''],
    fechaNacimientoDesde: [null as Date | null],
    fechaNacimientoHasta: [null as Date | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientes-atencion' },
    { label: 'breadcrumbs.pacientes', isActive: true },
  ];

  readonly displayedColumns = ['docIdentidadGub', 'tipoDocumento', 'nombreApellidos', 'fechaNacimiento', 'contactoPrimario'];

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.searchForm.patchValue(saved.formValues);
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.search();
    }
  }

  search(): void {
    this.loading.set(true);
    const { tipoDocumento, docIdentidadGub, nombreApellidos, fechaNacimientoDesde, fechaNacimientoHasta } = this.searchForm.value;
    this.service
      .search({
        tipoDocumento: tipoDocumento || undefined,
        docIdentidadGub: docIdentidadGub ?? undefined,
        nombreApellidos: nombreApellidos ?? undefined,
        fechaNacimientoDesde: toDateOnly(fechaNacimientoDesde),
        fechaNacimientoHasta: toDateOnly(fechaNacimientoHasta),
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
          this.notifier.showError(this.transloco.translate('pacientes.search.search-error'));
        },
      });
  }

  clear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.search();
  }

  goToNew(): void {
    this.router.navigate(['/pacientes/nueva']);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'pacientes');
    const headers = [
      t('table.docIdentidadGub'),
      t('table.tipoDocumento'),
      t('table.nombreApellidos'),
      t('table.fechaNacimiento'),
      t('table.contactoPrimario'),
    ];
    const { tipoDocumento, docIdentidadGub, nombreApellidos, fechaNacimientoDesde, fechaNacimientoHasta } = this.searchForm.value;
    const dateFormat = this.transloco.getActiveLang() === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    const filters = {
      tipoDocumento: tipoDocumento || undefined,
      docIdentidadGub: docIdentidadGub ?? undefined,
      nombreApellidos: nombreApellidos ?? undefined,
      fechaNacimientoDesde: toDateOnly(fechaNacimientoDesde),
      fechaNacimientoHasta: toDateOnly(fechaNacimientoHasta),
    };
    this.service.exportar(headers, dateFormat, filters).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('pacientes.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.notifier.showServerError(err, this.transloco.translate('pacientes.search.search-error')),
    });
  }
}
