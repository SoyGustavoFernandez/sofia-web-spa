import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { VentaConDetalle } from '../models/venta.model';
import { VentaDetailComponent } from './venta-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/ventas`;

function venta(overrides: Partial<VentaConDetalle> = {}): VentaConDetalle {
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
    detalles: [
      { id: 'a', loteId: 'l-a', productoNombre: 'A', numeroLote: 'LA', cantidad: 3, precioUnitario: 10, subtotal: 30, cantidadDevuelta: 1 },
      { id: 'b', loteId: 'l-b', productoNombre: 'B', numeroLote: 'LB', cantidad: 2, precioUnitario: 10, subtotal: 20, cantidadDevuelta: 0 },
    ],
    comprobante: { tipo: 'Boleta', numero: 'B001-00000011', estadoAceptacion: 'NoEnviado', urlVerificacion: null, urlXml: null, urlCdr: null, emisorRazonSocial: 'Botica QA', emisorRuc: '20212971893', sucursalDireccion: 'Av. Arequipa 123', clienteTipoDocumento: '1', clienteNumeroDocumento: '45781236', clienteNombre: 'Juan Perez' },
    pagos: [],
    devoluciones: [],
    ...overrides,
  };
}

function setup(data: VentaConDetalle, permisos: string[] = ['Devoluciones:ProcesarDevolucion', 'Ventas:Anular']) {
  const auth = { hasPermission: (modulo: string, accion: string) => permisos.includes(`${modulo}:${accion}`) };
  TestBed.configureTestingModule({
    imports: [VentaDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: data.id }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VentaDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.expectOne(`${BASE}/${data.id}`).flush(data);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock };
}

describe('VentaDetailComponent — returns', () => {
  it('offers Devolver on a completed, issued sale with units left when the user may process returns', () => {
    const { component } = setup(venta());
    expect(component.puedeDevolver()).toBeTrue();
  });

  it('hides Devolver without the ProcesarDevolucion permission', () => {
    const { component } = setup(venta(), ['Ventas:Anular']);
    expect(component.puedeDevolver()).toBeFalse();
  });

  it('hides Devolver when the sale is not Completada', () => {
    expect(setup(venta({ estado: 'Devuelta' })).component.puedeDevolver()).toBeFalse();
    TestBed.resetTestingModule();
    expect(setup(venta({ estado: 'Pendiente' })).component.puedeDevolver()).toBeFalse();
  });

  it('hides Devolver when the sale has no issued comprobante', () => {
    const { component } = setup(venta({ comprobante: null }));
    expect(component.puedeDevolver()).toBeFalse();
  });

  it('hides Devolver when every line was already returned', () => {
    const base = venta();
    const { component } = setup(venta({ detalles: base.detalles.map(d => ({ ...d, cantidadDevuelta: d.cantidad })) }));
    expect(component.puedeDevolver()).toBeFalse();
  });

  it('hides Anular once the sale has returns and lists its credit notes', () => {
    const { component, fixture } = setup(
      venta({
        devoluciones: [{ id: 'dev-1', fecha: '2026-09-30T11:00:00Z', numeroNotaCredito: 'BC01-00000001', montoReembolsado: 10, metodoReembolso: 'Efectivo' }],
      }),
    );
    expect(component.puedeAnular()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('BC01-00000001');
  });
});

describe('VentaDetailComponent — receipt', () => {
  it('offers reprinting the receipt of a completed sale', () => {
    expect(setup(venta()).component.puedeReimprimir()).toBeTrue();
  });

  it('does not offer reprinting the receipt of a voided sale', () => {
    const anulada = venta({ estado: 'Anulada', comprobante: { ...venta().comprobante!, estadoAceptacion: 'Anulado' } });
    const { component } = setup(anulada);
    expect(component.puedeReimprimir()).toBeFalse();
    expect(component.estadoComprobanteLabel('Anulado')).toBe('pos.estadoComprobante.Anulado');
  });
});
