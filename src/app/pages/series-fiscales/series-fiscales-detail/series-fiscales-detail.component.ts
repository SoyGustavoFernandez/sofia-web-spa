import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SerieFiscalService } from '../services/serie-fiscal.service';
import {
  ESTADOS_SERIE,
  EstadoSerie,
  SaveSerieFiscalRequest,
  SerieFiscal,
  TIPOS_CONFIGURABLES,
  TipoComprobante,
  esPrefijoValido,
} from '../models/serie-fiscal.model';
import { SucursalService } from '../../sucursales/services/sucursal.service';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';

// Backend business-rule codes that have a specific message instead of the generic save error
const SAVE_ERROR_KEYS: Record<string, string> = {
  'SerieFiscal.PrefijoDuplicado': 'seriesFiscales.errors.prefijoDuplicado',
  'SerieFiscal.ActivaDuplicada': 'seriesFiscales.errors.activaDuplicada',
  'SerieFiscal.ConComprobantes': 'seriesFiscales.errors.conComprobantes',
  'SerieFiscal.NotFound': 'seriesFiscales.errors.noEncontrada',
  'Sucursal.NotFound': 'seriesFiscales.errors.sucursalNoEncontrada',
  'CreateSerieFiscalCommand.PrefijoSerie': 'seriesFiscales.errors.prefijoInvalido',
  'UpdateSerieFiscalCommand.PrefijoSerie': 'seriesFiscales.errors.prefijoInvalido',
};

// Cross-field check: the prefix letter must match the document type
const prefijoPorTipoValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const tipo = group.get('tipoComprobante')?.value as TipoComprobante | null;
  const prefijo = group.get('prefijoSerie')?.value as string | null;
  if (tipo == null || !prefijo || !/^[A-Z0-9]{4}$/.test(prefijo)) return null;
  return esPrefijoValido(tipo, prefijo) ? null : { prefijoPorTipo: true };
};

@Component({
  selector: 'app-series-fiscales-detail',
  standalone: true,
  templateUrl: './series-fiscales-detail.component.html',
  providers: [provideTranslocoScope('series-fiscales')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class SeriesFiscalesDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SerieFiscalService);
  private readonly sucursalService = inject(SucursalService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly tipos = TIPOS_CONFIGURABLES;
  readonly estados = ESTADOS_SERIE;
  readonly tipoName = (tipo: TipoComprobante): string => TipoComprobante[tipo];

  readonly isNew = signal(false);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly sucursales = signal<SucursalListItem[]>([]);
  readonly tieneComprobantes = signal(false);

  private entityId: string | null = null;
  private snapshot: SerieFiscal | null = null;

  readonly form = this.fb.group(
    {
      sucursalId: [null as string | null, [Validators.required]],
      tipoComprobante: [TipoComprobante.Boleta as TipoComprobante | null, [Validators.required]],
      prefijoSerie: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{4}$/)]],
      correlativoActual: [0 as number | null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      estadoSerie: ['Activa' as EstadoSerie | null, [Validators.required]],
    },
    { validators: prefijoPorTipoValidator },
  );

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.sunat' },
    { label: 'breadcrumbs.seriesFiscales', route: '/series-fiscales' },
  ];

  ngOnInit(): void {
    this.sucursalService.search({ pageNumber: 1, pageSize: 1000 }).subscribe({
      next: result => this.sucursales.set(result.items),
      error: () => this.notifier.showError(this.transloco.translate('seriesFiscales.search.sucursales-error')),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      this.isEditMode.set(true);
    } else {
      this.entityId = id;
      this.form.disable();
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
        this.notifier.showError(this.transloco.translate('seriesFiscales.detail.load-error'));
      },
    });
  }

  private applySnapshot(): void {
    const s = this.snapshot;
    if (!s) return;
    this.tieneComprobantes.set(s.tieneComprobantes);
    this.form.patchValue({
      sucursalId: s.sucursalId,
      tipoComprobante: s.tipoComprobante,
      prefijoSerie: s.prefijoSerie,
      correlativoActual: s.correlativoActual,
      estadoSerie: s.estadoSerie,
    });
  }

  toUpperPrefijo(): void {
    const ctrl = this.form.controls.prefijoSerie;
    const value = ctrl.value ?? '';
    if (value !== value.toUpperCase()) ctrl.setValue(value.toUpperCase());
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.form.enable();
    // Once documents were issued only the status can change, otherwise their fiscal numbers would be rewritten
    if (this.tieneComprobantes()) {
      this.form.controls.sucursalId.disable();
      this.form.controls.tipoComprobante.disable();
      this.form.controls.prefijoSerie.disable();
      this.form.controls.correlativoActual.disable();
    }
  }

  cancelEdit(): void {
    if (this.isNew()) {
      this.router.navigate(['/series-fiscales']);
      return;
    }
    this.isEditMode.set(false);
    this.applySnapshot();
    this.form.disable();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: SaveSerieFiscalRequest = {
      sucursalId: v.sucursalId!,
      tipoComprobante: v.tipoComprobante!,
      prefijoSerie: v.prefijoSerie!,
      correlativoActual: Number(v.correlativoActual),
      estadoSerie: v.estadoSerie!,
    };
    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('seriesFiscales.detail.save-success'));
      this.router.navigate(['/series-fiscales']);
    };
    const fail = (err: unknown): void => {
      this.saving.set(false);
      const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
      const key = typeof code === 'string' ? SAVE_ERROR_KEYS[code] : undefined;
      this.notifier.showError(this.transloco.translate(key ?? 'seriesFiscales.detail.save-error'));
    };

    if (this.isNew()) {
      this.service.create(body).subscribe({ next: done, error: fail });
    } else {
      this.service.update(this.entityId!, body).subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('seriesFiscales.detail.delete-confirm-title'),
        message: this.transloco.translate('seriesFiscales.detail.delete-confirm-message'),
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
        this.notifier.showSuccess(this.transloco.translate('seriesFiscales.detail.delete-success'));
        this.router.navigate(['/series-fiscales']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'seriesFiscales.detail.delete-in-use'
            : 'seriesFiscales.detail.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }
}
