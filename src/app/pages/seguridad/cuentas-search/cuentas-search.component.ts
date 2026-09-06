import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { CuentaService } from '../services/cuenta.service';
import { CuentaDto, SearchCuentaParams } from '../models/cuenta.model';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-cuentas-search',
  standalone: true,
  templateUrl: './cuentas-search.component.html',
  providers: [provideTranslocoScope('cuentas')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class CuentasSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(CuentaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly showResults = signal(false);
  readonly loading = signal(false);
  readonly items = signal<CuentaDto[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchForm = this.fb.group({
    nombreUsuario: [''],
    nombreEmpleado: [''],
    cuentaActiva: [null as boolean | null],
    bloqueado: [null as boolean | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.administracion' },
    { label: 'breadcrumbs.cuentas', isActive: true },
  ];

  readonly displayedColumns = ['nombreUsuario', 'empleado', 'cuentaActiva', 'bloqueado', 'intentosFallidos'];

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
    const { nombreUsuario, nombreEmpleado, cuentaActiva, bloqueado } = this.searchForm.value;
    const params: SearchCuentaParams = {
      nombreUsuario: nombreUsuario ?? undefined,
      nombreEmpleado: nombreEmpleado ?? undefined,
      cuentaActiva: cuentaActiva ?? undefined,
      bloqueado: bloqueado ?? undefined,
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
        this.notifier.showError(this.transloco.translate('cuentas.search.search-error'));
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
    this.router.navigate(['/cuentas/nueva']);
  }

  isBloqueado(cuenta: CuentaDto): boolean {
    if (!cuenta.bloqueadoHasta) return false;
    return new Date(cuenta.bloqueadoHasta) > new Date();
  }
}
