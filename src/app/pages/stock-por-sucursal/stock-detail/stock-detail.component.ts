import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { StockService } from '../services/stock.service';
import { StockPorSucursal } from '../models/stock.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { LoteService } from '../../lotes/services/lote.service';
import { Lote } from '../../lotes/models/lote.model';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  templateUrl: './stock-detail.component.html',
  styles: [`
    .lote-option { display: flex; flex-direction: column; line-height: 1.3; padding: 2px 0; }
    .lote-option__numero { font-weight: 500; }
    .lote-option__producto { font-size: 0.8em; opacity: 0.65; }
  `],
  providers: [provideTranslocoScope('stock-por-sucursal')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class StockDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(StockService);
  private readonly sucursalService = inject(SucursalService);
  private readonly loteService = inject(LoteService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly snapshot = signal<StockPorSucursal | null>(null);

  // autocomplete fields for create mode
  readonly sucursalCtrl = new FormControl('');
  readonly loteCtrl = new FormControl('');
  readonly selectedSucursal = signal<SucursalListItem | null>(null);
  readonly selectedLote = signal<Lote | null>(null);
  readonly sucursalOptions = signal<SucursalListItem[]>([]);
  readonly loteOptions = signal<Lote[]>([]);
  readonly sucursalTouched = signal(false);
  readonly loteTouched = signal(false);

  private entityId = '';

  readonly form = this.fb.group({
    cantidadFisica: [0, [Validators.required, Validators.min(0)]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.inventario' },
    { label: 'breadcrumbs.stock-por-sucursal', route: '/stock-por-sucursal' },
  ];

  constructor() {
    this.sucursalCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as SucursalListItem[] });
        return this.sucursalService.search({ nombre: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.sucursalOptions.set(result.items));

    this.loteCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as Lote[] });
        return this.loteService.search({ numeroLote: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.loteOptions.set(result.items));
  }

  ngOnInit(): void {
    if (this.route.snapshot.data['isNew'] === true) {
      this.isNew.set(true);
      this.isEditMode.set(true);
      return;
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/stock-por-sucursal']);
      return;
    }
    this.entityId = id;
    this.form.disable();
    this.load();
  }

  loteDisplay(lote: Lote): string {
    return `${lote.numeroLoteMfr} — ${lote.nombreProducto}`;
  }

  selectSucursal(s: SucursalListItem): void {
    this.selectedSucursal.set(s);
    this.sucursalCtrl.setValue(s.nombre, { emitEvent: false });
  }

  selectLote(l: Lote): void {
    this.selectedLote.set(l);
    this.loteCtrl.setValue(this.loteDisplay(l), { emitEvent: false });
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId).subscribe({
      next: data => {
        this.snapshot.set(data);
        this.form.patchValue({ cantidadFisica: data.cantidadFisica });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('stockPorSucursal.detail.load-error'));
      },
    });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/stock-por-sucursal']);
      return;
    }
    this.isEditMode.set(false);
    this.form.patchValue({ cantidadFisica: this.snapshot()?.cantidadFisica ?? 0 });
    this.form.disable();
  }

  save(): void {
    if (this.isNew()) {
      this.saveNew();
    } else {
      this.saveExisting();
    }
  }

  private saveNew(): void {
    this.sucursalTouched.set(true);
    this.loteTouched.set(true);
    if (this.sucursalCtrl.value !== this.selectedSucursal()?.nombre) this.selectedSucursal.set(null);
    if (this.loteCtrl.value !== this.loteDisplay(this.selectedLote()!)) this.selectedLote.set(null);
    this.form.markAllAsTouched();
    if (!this.selectedSucursal() || !this.selectedLote() || this.form.invalid) return;

    this.saving.set(true);
    this.service.registrar({
      sucursalId: this.selectedSucursal()!.id,
      loteId: this.selectedLote()!.id,
      cantidad: this.form.value.cantidadFisica ?? 0,
    }).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('stockPorSucursal.create.save-success'));
        this.router.navigate(['/stock-por-sucursal']);
      },
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('stockPorSucursal.create.save-error'));
      },
    });
  }

  private saveExisting(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const nuevaCantidad = this.form.value.cantidadFisica ?? 0;
    this.service.ajustar(this.entityId, nuevaCantidad).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('stockPorSucursal.detail.save-success'));
        this.router.navigate(['/stock-por-sucursal']);
      },
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('stockPorSucursal.detail.save-error'));
      },
    });
  }
}
