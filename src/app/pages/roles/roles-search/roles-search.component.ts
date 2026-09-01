import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { RangeSliderFieldComponent } from '@shared/components/range-slider-field/range-slider-field.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { RolService } from '../services/rol.service';
import { RolResponse, SearchRolParams } from '../models/rol.model';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-roles-search',
  standalone: true,
  templateUrl: './roles-search.component.html',
  providers: [provideTranslocoScope('roles')],
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
export class RolesSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(RolService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly NIVEL_MIN = 0;
  readonly NIVEL_MAX = 100;

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<RolResponse[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly nivelMin = signal(this.NIVEL_MIN);
  readonly nivelMax = signal(this.NIVEL_MAX);

  readonly searchForm = this.fb.group({
    nombreRol: [''],
    descripcion: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.roles', isActive: true },
  ];

  readonly displayedColumns = ['nombreRol', 'descripcion', 'nivelJerarquia'];

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
    const { nombreRol, descripcion } = this.searchForm.value;
    const params: SearchRolParams = {
      nombreRol: nombreRol ?? undefined,
      descripcion: descripcion ?? undefined,
      nivelJerarquiaDesde: this.nivelMin() !== this.NIVEL_MIN ? this.nivelMin() : undefined,
      nivelJerarquiaHasta: this.nivelMax() !== this.NIVEL_MAX ? this.nivelMax() : undefined,
      pageNumber: this.pageIndex() + 1,
      pageSize: this.pageSize(),
    };
    this.service.search(params).subscribe({
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
        this.notifier.showError(this.transloco.translate('roles.search.search-error'));
      },
    });
  }

  clear(): void {
    this.searchForm.reset();
    this.nivelMin.set(this.NIVEL_MIN);
    this.nivelMax.set(this.NIVEL_MAX);
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
    this.router.navigate(['/roles/nueva']);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'roles');
    const headers = [
      t('table.nombreRol'),
      t('table.descripcion'),
      t('table.nivelJerarquia'),
    ];
    const { nombreRol, descripcion } = this.searchForm.value;
    const filters = {
      nombreRol: nombreRol ?? undefined,
      descripcion: descripcion ?? undefined,
      nivelJerarquiaDesde: this.nivelMin() !== this.NIVEL_MIN ? this.nivelMin() : undefined,
      nivelJerarquiaHasta: this.nivelMax() !== this.NIVEL_MAX ? this.nivelMax() : undefined,
    };
    this.service.exportar(headers, filters).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('roles.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('roles.search.search-error')),
    });
  }
}
