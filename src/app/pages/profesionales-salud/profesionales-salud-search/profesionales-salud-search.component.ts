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
import { ProfesionalSaludService } from '../services/profesional-salud.service';
import { ProfesionalSaludListItem } from '../models/profesional-salud.model';
@Component({
  selector: 'app-profesionales-salud-search',
  standalone: true,
  templateUrl: './profesionales-salud-search.component.html',
  providers: [provideTranslocoScope('profesionalesSalud')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class ProfesionalesSaludSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(ProfesionalSaludService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<ProfesionalSaludListItem[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchForm = this.fb.group({ numeroRegistro: [''], nombrePrescriptor: [''] });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientes-atencion' },
    { label: 'breadcrumbs.profesionales-salud', isActive: true },
  ];

  readonly displayedColumns = ['numeroRegistro', 'nombrePrescriptor', 'direccionClinica'];

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
    const { numeroRegistro, nombrePrescriptor } = this.searchForm.value;
    this.service
      .search({
        numeroRegistro: numeroRegistro ?? undefined,
        nombrePrescriptor: nombrePrescriptor ?? undefined,
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
          this.notifier.showError(this.transloco.translate('profesionalesSalud.search.search-error'));
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
    this.router.navigate(['/profesionales-salud/nueva']);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'profesionalesSalud');
    const headers = [
      t('table.numeroRegistro'),
      t('table.nombrePrescriptor'),
      t('table.direccionClinica'),
    ];
    const { numeroRegistro, nombrePrescriptor } = this.searchForm.value;
    const filters = {
      numeroRegistro: numeroRegistro ?? undefined,
      nombrePrescriptor: nombrePrescriptor ?? undefined,
    };
    this.service.exportar(headers, filters).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('profesionalesSalud.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.notifier.showServerError(err, this.transloco.translate('profesionalesSalud.search.search-error')),
    });
  }
}
