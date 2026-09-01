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
import { AseguradoraService } from '../services/aseguradora.service';
import { AseguradoraListItem } from '../models/aseguradora.model';

@Component({
  selector: 'app-aseguradoras-search',
  standalone: true,
  templateUrl: './aseguradoras-search.component.html',
  providers: [provideTranslocoScope('aseguradoras')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class AseguradorasSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(AseguradoraService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<AseguradoraListItem[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchForm = this.fb.group({ nombreComercial: [''], codigoIdentificadorNacional: [''] });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.catalogos' },
    { label: 'breadcrumbs.aseguradoras', isActive: true },
  ];

  readonly displayedColumns = ['nombreComercial', 'codigoIdentificadorNacional'];

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
    const { nombreComercial, codigoIdentificadorNacional } = this.searchForm.value;
    this.service
      .search({
        nombreComercial: nombreComercial ?? undefined,
        codigoIdentificadorNacional: codigoIdentificadorNacional ?? undefined,
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
          this.notifier.showError(this.transloco.translate('aseguradoras.search.search-error'));
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
    this.router.navigate(['/aseguradoras/nueva']);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'aseguradoras');
    const headers = [
      t('table.nombreComercial'),
      t('table.codigoIdentificadorNacional'),
    ];
    const { nombreComercial, codigoIdentificadorNacional } = this.searchForm.value;
    const filters = {
      nombreComercial: nombreComercial ?? undefined,
      codigoIdentificadorNacional: codigoIdentificadorNacional ?? undefined,
    };
    this.service.exportar(headers, filters).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('aseguradoras.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.notifier.showServerError(err, this.transloco.translate('aseguradoras.search.search-error')),
    });
  }
}
