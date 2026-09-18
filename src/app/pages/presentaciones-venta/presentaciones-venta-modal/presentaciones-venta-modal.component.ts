import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { PresentacionVentaService } from '../services/presentacion-venta.service';
import { PresentacionVenta } from '../models/presentacion-venta.model';
import { JerarquiaUoMService } from '../../jerarquias/services/jerarquia-uom.service';
import { UnidadVendible } from '../../jerarquias/models/jerarquia-uom.model';

export interface PresentacionesVentaModalData {
  productoId: string;
  productoNombre: string;
  unidadBaseNombre: string;
}

@Component({
  selector: 'app-presentaciones-venta-modal',
  standalone: true,
  templateUrl: './presentaciones-venta-modal.component.html',
  providers: [provideTranslocoScope('presentaciones-venta')],
  imports: [CommonModule, ReactiveFormsModule, TranslocoModule, MaterialModule],
})
export class PresentacionesVentaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PresentacionVentaService);
  private readonly jerarquiaService = inject(JerarquiaUoMService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly dialogRef = inject(MatDialogRef<PresentacionesVentaModalComponent>);
  readonly data = inject<PresentacionesVentaModalData>(MAT_DIALOG_DATA);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly items = signal<PresentacionVenta[]>([]);
  readonly unidadesVendibles = signal<UnidadVendible[]>([]);

  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.group({
    unidadVentaId: [null as string | null, [Validators.required]],
    precioVenta: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly displayedColumns = ['descripcion', 'cantidadUnidadesBase', 'precioVenta', 'acciones'];

  // Units already used by another existing presentación can't be picked again for a new one,
  // but editing a presentación must still show its own currently-assigned unit as an option.
  readonly unidadesDisponibles = computed(() => {
    const editId = this.editingId();
    const usados = new Set(this.items().filter(p => p.id !== editId).map(p => p.unidadVentaId));
    return this.unidadesVendibles().filter(u => !usados.has(u.unidadMedidaId));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.jerarquiaService.getUnidadesVendibles(this.data.productoId).subscribe({
      next: unidades => {
        this.unidadesVendibles.set(unidades);
        this.load();
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('presentacionesVenta.modal.load-error'));
      },
    });
  }

  private load(): void {
    this.service
      .search({ productoId: this.data.productoId, pageNumber: 1, pageSize: 100 })
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notifier.showError(this.transloco.translate('presentacionesVenta.modal.load-error'));
        },
      });
  }

  irAJerarquias(): void {
    this.dialogRef.close();
    this.router.navigate(['/jerarquias/nueva']);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.form.reset();
    this.showForm.set(true);
  }

  openEditForm(item: PresentacionVenta): void {
    this.editingId.set(item.id);
    this.form.setValue({
      unidadVentaId: item.unidadVentaId,
      precioVenta: item.precioVenta,
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    const { unidadVentaId, precioVenta } = this.form.value;
    const editingId = this.editingId();

    const done = (): void => {
      this.notifier.showSuccess(this.transloco.translate('presentacionesVenta.modal.save-success'));
      this.saving.set(false);
      this.cancelForm();
      this.load();
    };
    const fail = (err: unknown): void => {
      this.saving.set(false);
      const key =
        err instanceof HttpErrorResponse && err.status === 409
          ? 'presentacionesVenta.modal.unidad-duplicada'
          : 'presentacionesVenta.modal.save-error';
      this.notifier.showError(this.transloco.translate(key));
    };

    if (editingId) {
      this.service.update(editingId, { unidadVentaId: unidadVentaId!, precioVenta: precioVenta! }).subscribe({ next: done, error: fail });
    } else {
      this.service
        .create({ productoId: this.data.productoId, unidadVentaId: unidadVentaId!, precioVenta: precioVenta! })
        .subscribe({ next: done, error: fail });
    }
  }

  confirmDelete(item: PresentacionVenta): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('presentacionesVenta.modal.delete-confirm-title'),
        message: this.transloco.translate('presentacionesVenta.modal.delete-confirm-message'),
      } as ConfirmDialogData,
      width: '400px',
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.delete(item.id);
    });
  }

  private delete(id: string): void {
    this.deletingId.set(id);
    this.service.delete(id).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('presentacionesVenta.modal.delete-success'));
        this.deletingId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        const key =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'presentacionesVenta.modal.delete-in-use'
            : 'presentacionesVenta.modal.delete-error';
        this.notifier.showError(this.transloco.translate(key));
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
