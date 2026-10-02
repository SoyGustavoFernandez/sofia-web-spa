import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { DestinoDevolucion, MetodoPago, VentaConDetalle, VentaDetalle } from '../../models/venta.model';
import { DevolverVentaDialogComponent, MOTIVO_DEVOLUCION_POR_ITEM, MOTIVO_DEVOLUCION_TOTAL } from './devolver-venta-dialog.component';

const URL = `${environment.api.baseurl}/api/v1/devoluciones`;

function detalle(id: string, cantidad: number, cantidadDevuelta: number, precioUnitario = 10): VentaDetalle {
  return {
    id,
    loteId: `lote-${id}`,
    productoNombre: `Producto ${id}`,
    numeroLote: `L-${id}`,
    cantidad,
    precioUnitario,
    subtotal: cantidad * precioUnitario,
    cantidadDevuelta,
  };
}

function venta(detalles: VentaDetalle[]): VentaConDetalle {
  return {
    id: 'venta-1',
    codigoVenta: 'B001-00000011',
    fechaHora: '2026-09-30T10:00:00Z',
    total: 50,
    estado: 'Completada',
    motivoAnulacion: null,
    empleadoNombre: 'Cajero QA',
    clienteId: null,
    clienteNombre: null,
    clienteDocumento: null,
    clienteTipoDocumento: null,
    detalles,
    comprobante: { tipo: 'Boleta', numero: 'B001-00000011', estadoAceptacion: 'NoEnviado', urlVerificacion: null, urlXml: null, urlCdr: null, emisorRazonSocial: 'Botica QA', emisorRuc: '20212971893', sucursalDireccion: 'Av. Arequipa 123', clienteTipoDocumento: '1', clienteNumeroDocumento: '45781236', clienteNombre: 'Juan Perez' },
    pagos: [],
    devoluciones: [],
    recetaVerificadaPor: null,
    recetaVerificadaEn: null,
  };
}

function setup(detalles: VentaDetalle[]) {
  const dialogRef = jasmine.createSpyObj<MatDialogRef<DevolverVentaDialogComponent>>('MatDialogRef', ['close']);
  const notifier = jasmine.createSpyObj<ErrorNotifierService>('ErrorNotifierService', ['showError', 'showSuccess']);
  TestBed.configureTestingModule({
    imports: [DevolverVentaDialogComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: { venta: venta(detalles) } },
      { provide: ErrorNotifierService, useValue: notifier },
    ],
  });
  const fixture = TestBed.createComponent(DevolverVentaDialogComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController), dialogRef, notifier };
}

describe('DevolverVentaDialogComponent', () => {
  it('lists only lines with units left and caps each quantity at what remains returnable', () => {
    const { component } = setup([detalle('a', 3, 1), detalle('b', 2, 2)]);

    expect(component.lineas.length).toBe(1);
    expect(component.lineas[0].devolvible).toBe(2);

    const ctrl = component.lineasForm.at(0).controls.cantidad;
    ctrl.setValue(5);
    expect(ctrl.hasError('max')).toBeTrue();
    component.capCantidad(0);
    expect(ctrl.value).toBe(2);

    ctrl.setValue(-1);
    component.capCantidad(0);
    expect(ctrl.value).toBe(0);
  });

  it('picks reason 06 when everything remaining is returned and 07 otherwise', () => {
    const { component } = setup([detalle('a', 3, 0), detalle('b', 2, 0)]);
    const motivo = component.form.controls.motivo;
    expect(motivo.value).toBe(MOTIVO_DEVOLUCION_POR_ITEM);

    component.devolverTodo();
    expect(motivo.value).toBe(MOTIVO_DEVOLUCION_TOTAL);

    component.lineasForm.at(1).controls.cantidad.setValue(1);
    expect(motivo.value).toBe(MOTIVO_DEVOLUCION_POR_ITEM);
  });

  it('computes the estimated refund from the quantities to return', () => {
    const { component } = setup([detalle('a', 3, 0, 10), detalle('b', 2, 0, 4.5)]);

    component.lineasForm.at(0).controls.cantidad.setValue(1);
    component.lineasForm.at(1).controls.cantidad.setValue(2);

    expect(component.montoEstimado()).toBe(19);
  });

  it('posts only lines with a quantity, with numeric enums, and closes on success', () => {
    const { component, httpMock, dialogRef } = setup([detalle('a', 3, 0), detalle('b', 2, 0)]);
    component.lineasForm.at(0).controls.cantidad.setValue(1);
    component.lineasForm.at(0).controls.destino.setValue(DestinoDevolucion.Cuarentena_DIGEMID);
    component.form.patchValue({ sustento: '  Producto vencido  ', metodoReembolso: MetodoPago.YapePlin });

    component.onConfirm();

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === URL);
    expect(req.request.body).toEqual({
      comprobanteOrigenId: 'venta-1',
      motivoSunatCatalogo: '07',
      sustentoDescriptivo: 'Producto vencido',
      metodoReembolso: 1,
      detalles: [{ detalleVentaId: 'a', cantidadDevuelta: 1, destinoFisicoLogico: 1 }],
    });
    req.flush('dev-1');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    httpMock.verify();
  });

  it('does not post without quantities or without a justification', () => {
    const { component, httpMock, notifier } = setup([detalle('a', 3, 0)]);
    component.form.patchValue({ sustento: 'Motivo' });

    component.onConfirm();
    expect(notifier.showError).toHaveBeenCalled();

    component.lineasForm.at(0).controls.cantidad.setValue(1);
    component.form.patchValue({ sustento: '   ' });
    component.onConfirm();

    httpMock.expectNone(URL);
    httpMock.verify();
  });

  it('maps the backend exceeded-quantity code to its message and keeps the dialog open', () => {
    const { component, httpMock, notifier, dialogRef } = setup([detalle('a', 3, 0)]);
    component.lineasForm.at(0).controls.cantidad.setValue(1);
    component.form.patchValue({ sustento: 'Motivo' });

    component.onConfirm();
    httpMock.expectOne(URL).flush({ code: 'Devolucion.Cantidad.Excedida' }, { status: 400, statusText: 'Bad Request' });

    expect(notifier.showError).toHaveBeenCalledWith('pos.devolucion.errors.cantidadExcedida');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
  });
});
