import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { VentaService } from './venta.service';
import { EstadoVenta, MetodoPago, PaginatedList, Venta, VentaConDetalle } from '../models/venta.model';

const BASE = `${environment.api.baseurl}/api/v1/ventas`;

describe('VentaService', () => {
  let service: VentaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VentaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() forwards estado even when it is the falsy enum value 0 (Completada)', () => {
    service.search({ pageNumber: 1, pageSize: 10, estado: EstadoVenta.Completada }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('estado')).toBe('0');
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<Venta>);
  });

  it('getById() requests the sale with its detail', () => {
    service.getById('venta-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/venta-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as VentaConDetalle);
  });

  it('crear() POSTs the new sale payload', () => {
    const body = {
      sesionId: 'sesion-1',
      detalles: [{ loteId: 'lote-1', cantidad: 2, precioUnitario: 10, costoHistorico: 6 }],
      pagos: [{ metodoPago: MetodoPago.Efectivo, montoPagado: 20 }],
    };

    service.crear(body).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ventaId: 'venta-1', comprobante: null });
  });

  it('completar() PUTs to the completar endpoint', () => {
    const body = { pagos: [{ metodoPago: MetodoPago.Efectivo, montoPagado: 20 }] };

    service.completar('venta-1', body).subscribe();

    const req = httpMock.expectOne(`${BASE}/venta-1/completar`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ ventaId: 'venta-1', comprobante: null });
  });

  it('actualizarDetalles() PUTs the pending sale details', () => {
    const body = { detalles: [{ loteId: 'lote-1', cantidad: 1, precioUnitario: 10, costoHistorico: 6 }] };

    service.actualizarDetalles('venta-1', body).subscribe();

    const req = httpMock.expectOne(`${BASE}/venta-1/detalles`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('anular() PUTs a raw JSON-encoded string body with an explicit Content-Type', () => {
    service.anular('venta-1', 'Cliente se arrepintió').subscribe();

    const req = httpMock.expectOne(`${BASE}/venta-1/anular`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toBe(JSON.stringify('Cliente se arrepintió'));
    req.flush(null);
  });

  it('exportar() requests a blob export with headers, dateFormat and filters', () => {
    service.exportar(['Codigo'], 'dd/MM/yyyy', { estado: EstadoVenta.Anulada }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Codigo'], dateFormat: 'dd/MM/yyyy', estado: EstadoVenta.Anulada });
    req.flush(new Blob());
  });
});
