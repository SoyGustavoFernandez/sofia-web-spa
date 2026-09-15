import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { VentaService } from '../services/venta.service';
import { VentaConDetalle, EstadoVenta } from '../models/venta.model';
import { AnularVentaDialogComponent } from '../dialogs/anular-venta-dialog/anular-venta-dialog.component';
import { ComprobanteDialogComponent, ComprobanteDialogData } from '../dialogs/comprobante-dialog/comprobante-dialog.component';

@Component({
  selector: 'app-venta-detail',
  standalone: true,
  templateUrl: './venta-detail.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [CommonModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class VentaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(VentaService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly anulando = signal(false);
  readonly venta = signal<VentaConDetalle | null>(null);

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.puntoVenta' },
    { label: 'breadcrumbs.ventas', route: '/pos' },
  ];

  readonly detallesColumns = ['productoNombre', 'numeroLote', 'cantidad', 'precioUnitario', 'subtotal'];
  readonly pagosColumns = ['metodoPago', 'montoPagado', 'referenciaOperacion', 'fechaPago'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: venta => {
        this.venta.set(venta);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('pos.ventasDetail.loadError'));
      },
    });
  }

  estadoLabel(estado: string): string {
    return this.transloco.translate(`pos.estado.${estado}`);
  }

  private static readonly METODO_PAGO_KEYS: Record<string, string> = {
    Efectivo: 'efectivo',
    YapePlin: 'yapePlin',
    Tarjeta: 'tarjeta',
    Transferencia: 'transferencia',
  };

  metodoPagoLabel(metodo: string): string {
    const key = VentaDetailComponent.METODO_PAGO_KEYS[metodo] ?? metodo;
    return this.transloco.translate(`pos.checkout.${key}`);
  }

  puedeAnular(): boolean {
    const estado = this.venta()?.estado;
    return estado === EstadoVenta[EstadoVenta.Completada] || estado === EstadoVenta[EstadoVenta.Pendiente];
  }

  puedeCobrar(): boolean {
    return this.venta()?.estado === EstadoVenta[EstadoVenta.Pendiente];
  }

  cobrar(): void {
    this.router.navigate(['/pos/nueva'], { queryParams: { continuar: this.venta()!.id } });
  }

  puedeReimprimir(): boolean {
    return !!this.venta()?.comprobante;
  }

  reimprimirComprobante(): void {
    const v = this.venta()!;
    const total = v.total;
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    const data: ComprobanteDialogData = {
      comprobante: v.comprobante,
      total,
      subtotal,
      igv,
      metodosPago: v.pagos.map(p => this.metodoPagoLabel(p.metodoPago)).join(', '),
      detalles: v.detalles.map(d => ({
        productoNombre: d.productoNombre,
        numeroLote: d.numeroLote,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
      })),
      pagos: v.pagos.map(p => ({ metodo: this.metodoPagoLabel(p.metodoPago), monto: p.montoPagado })),
      clienteNombre: v.clienteNombre ?? this.transloco.translate('pos.checkout.clienteEventual'),
      empresaNombre: null,
      cajeroNombre: v.empleadoNombre,
      fecha: new Date(v.fechaHora),
    };
    const ref = this.dialog.open(ComprobanteDialogComponent, { width: '500px', data });
    ref.afterClosed().subscribe((action: string | undefined) => {
      if (action === 'nueva') {
        this.router.navigate(['/pos/nueva']);
      } else if (action === 'volver') {
        this.router.navigate(['/pos']);
      }
    });
  }

  anular(): void {
    const ref = this.dialog.open(AnularVentaDialogComponent, { width: '450px' });
    ref.afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) {
        return;
      }
      this.anulando.set(true);
      this.service.anular(this.venta()!.id, motivo).subscribe({
        next: () => {
          this.anulando.set(false);
          this.notifier.showSuccess(this.transloco.translate('pos.ventasDetail.anularSuccess'));
          this.load(this.venta()!.id);
        },
        error: () => {
          this.anulando.set(false);
          this.notifier.showError(this.transloco.translate('pos.ventasDetail.anularError'));
        },
      });
    });
  }
}
