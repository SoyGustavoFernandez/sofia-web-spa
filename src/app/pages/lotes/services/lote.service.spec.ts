import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { LoteService } from './lote.service';
import { Lote, PaginatedList } from '../models/lote.model';

const BASE = `${environment.api.baseurl}/api/v1/lotesinventario`;

describe('LoteService', () => {
  let service: LoteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() always sends pageNumber and pageSize', () => {
    service.search({ pageNumber: 2, pageSize: 25 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.has('numeroLote')).toBeFalse();
    req.flush({ items: [], pageNumber: 2, totalPages: 0, totalCount: 0 } as PaginatedList<Lote>);
  });

  it('search() only appends filter params that are actually provided', () => {
    service
      .search({
        pageNumber: 1,
        pageSize: 10,
        productoNombre: 'Paracetamol',
        numeroLote: 'L-001',
        caducidadDesde: '2026-01-01',
      })
      .subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('productoNombre')).toBe('Paracetamol');
    expect(req.request.params.get('numeroLote')).toBe('L-001');
    expect(req.request.params.get('caducidadDesde')).toBe('2026-01-01');
    expect(req.request.params.has('caducidadHasta')).toBeFalse();
    expect(req.request.params.has('fabricacionDesde')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<Lote>);
  });

  it('getById() requests the single lote by id', () => {
    service.getById('lote-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/lote-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as Lote);
  });

  it('create() POSTs the payload and returns the new id', () => {
    const body = { productoId: 'p1', numeroLoteMfr: 'L-1', fechaCaducidad: '2027-01-01' };
    let result: string | undefined;

    service.create(body).subscribe(id => (result = id));

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush('new-id');

    expect(result).toBe('new-id');
  });

  it('update() PUTs to the lote-specific endpoint', () => {
    const body = { numeroLoteMfr: 'L-2', fechaCaducidad: '2027-06-01' };

    service.update('lote-1', body).subscribe();

    const req = httpMock.expectOne(`${BASE}/lote-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('delete() DELETEs the lote-specific endpoint', () => {
    service.delete('lote-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/lote-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('exportar() POSTs headers/dateFormat/filters and requests a blob response', () => {
    let result: Blob | undefined;

    service
      .exportar(['Producto', 'Lote'], 'dd/MM/yyyy', { productoNombre: 'Ibuprofeno' })
      .subscribe(blob => (result = blob));

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({
      headers: ['Producto', 'Lote'],
      dateFormat: 'dd/MM/yyyy',
      productoNombre: 'Ibuprofeno',
    });
    const blob = new Blob(['data']);
    req.flush(blob);

    expect(result).toBe(blob);
  });
});
