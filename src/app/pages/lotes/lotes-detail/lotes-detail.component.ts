import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { LoteService } from '../services/lote.service';
import { Lote } from '../models/lote.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';

interface Ref {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-lotes-detail',
  standalone: true,
  templateUrl: './lotes-detail.component.html',
  providers: [provideTranslocoScope('lotes')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class LotesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(LoteService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly productoOptions = signal<MedicamentoListItem[]>([]);
  readonly selectedProducto = signal<Ref | null>(null);
  readonly productoTouched = signal(false);

  readonly productoCtrl = new FormControl('');

  private entityId: string | null = null;
  private snapshot: Lote | null = null;

  readonly form = this.fb.group({
    numeroLoteMfr: ['', [Validators.required, Validators.maxLength(100)]],
    fechaFabricacion: [null as Date | null],
    fechaCaducidad: [null as Date | null, [Validators.required]],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.inventario' },
    { label: 'breadcrumbs.lotes', route: '/lotes' },
  ];

  constructor() {
    this.productoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (typeof term !== 'string' || !term) return of({ items: [] as MedicamentoListItem[] });
          return this.medicamentoService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.productoOptions.set(result.items));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
      this.productoCtrl.disable();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId!).subscribe({
      next: data => {
        this.snapshot = data;
        this.applySnapshot();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('lotes.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot;
    if (!s) return;
    this.form.patchValue({
      numeroLoteMfr: s.numeroLoteMfr,
      fechaFabricacion: s.fechaFabricacion ? new Date(s.fechaFabricacion) : null,
      fechaCaducidad: s.fechaCaducidad ? new Date(s.fechaCaducidad) : null,
    });
    this.selectedProducto.set({ id: s.productoId, nombre: s.nombreProducto });
    this.productoCtrl.setValue(s.nombreProducto, { emitEvent: false });
  }

  selectProducto(p: MedicamentoListItem): void {
    this.selectedProducto.set({ id: p.id, nombre: p.nombreComercial });
    this.productoCtrl.setValue(p.nombreComercial, { emitEvent: false });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    // Product cannot be changed once the batch exists.
    this.productoCtrl.disable();
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/lotes']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
    this.productoCtrl.disable();
    this.productoTouched.set(false);
  }

  private toIsoDate(date: Date | null | undefined): string | undefined {
    return date ? new Date(date).toISOString().split('T')[0] : undefined;
  }

  save(): void {
    this.form.markAllAsTouched();
    this.productoTouched.set(true);

    if (this.isNew() && this.productoCtrl.value !== this.selectedProducto()?.nombre) {
      this.selectedProducto.set(null);
    }

    if (this.form.invalid || (this.isNew() && !this.selectedProducto())) {
      return;
    }

    this.saving.set(true);
    const v = this.form.value;
    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('lotes.detail.save-success'));
      this.router.navigate(['/lotes']);
    };
    const fail = (err: unknown): void => {
      this.saving.set(false);
      const key =
        err instanceof HttpErrorResponse && err.status === 409
          ? 'lotes.detail.save-conflict'
          : 'lotes.detail.save-error';
      this.notifier.showError(this.transloco.translate(key));
    };

    if (this.isNew()) {
      this.service
        .create({
          productoId: this.selectedProducto()!.id,
          numeroLoteMfr: v.numeroLoteMfr!,
          fechaFabricacion: this.toIsoDate(v.fechaFabricacion),
          fechaCaducidad: this.toIsoDate(v.fechaCaducidad)!,
        })
        .subscribe({ next: done, error: fail });
    } else {
      this.service
        .update(this.entityId!, {
          numeroLoteMfr: v.numeroLoteMfr!,
          fechaFabricacion: this.toIsoDate(v.fechaFabricacion),
          fechaCaducidad: this.toIsoDate(v.fechaCaducidad)!,
        })
        .subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('lotes.detail.delete-confirm-title'),
        message: this.transloco.translate('lotes.detail.delete-confirm-message'),
      } as ConfirmDialogData,
      width: '400px',
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.delete();
    });
  }

  private delete(): void {
    this.deleting.set(true);
    this.service.delete(this.entityId!).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('lotes.detail.delete-success'));
        this.router.navigate(['/lotes']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'lotes.detail.delete-in-use'
            : 'lotes.detail.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }
}
