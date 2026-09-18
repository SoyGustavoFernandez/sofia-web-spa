import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { StockService } from './stock.service';
import { PaginatedList, StockPorSucursal } from '../models/stock.model';

const BASE = `${environment.api.baseurl}/api/v1/stockporsucursal`;

describe('StockService', () => {
  let service: StockService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() defaults soloConStock to true when not provided', () => {
    service.search({ pageNumber: 1, pageSize: 10 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('soloConStock')).toBe('true');
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<StockPorSucursal>);
  });

  it('search() respects an explicit soloConStock=false and numeric range filters', () => {
    service.search({ pageNumber: 1, pageSize: 10, soloConStock: false, cantidadMin: 5, cantidadMax: 50 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('soloConStock')).toBe('false');
    expect(req.request.params.get('cantidadMin')).toBe('5');
    expect(req.request.params.get('cantidadMax')).toBe('50');
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<StockPorSucursal>);
  });

  it('getById() requests the stock item by id', () => {
    service.getById('stock-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/stock-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as StockPorSucursal);
  });

  it('registrar() POSTs to the lotesinventario/stock endpoint, not stockporsucursal', () => {
    const body = { sucursalId: 'suc-1', loteId: 'lote-1', cantidad: 10 };
    service.registrar(body).subscribe();

    const req = httpMock.expectOne(`${environment.api.baseurl}/api/v1/lotesinventario/stock`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush('new-id');
  });

  it('ajustar() PUTs the new quantity to the stock-specific endpoint', () => {
    service.ajustar('stock-1', 25).subscribe();

    const req = httpMock.expectOne(`${BASE}/stock-1/ajustar`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nuevaCantidad: 25 });
    req.flush(null);
  });

  it('exportar() requests a blob export with headers, dateFormat and filters', () => {
    service.exportar(['Sucursal'], 'dd/MM/yyyy', { sucursalNombre: 'Miraflores' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Sucursal'], dateFormat: 'dd/MM/yyyy', sucursalNombre: 'Miraflores' });
    req.flush(new Blob());
  });
});
