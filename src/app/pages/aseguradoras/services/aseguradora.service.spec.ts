import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { AseguradoraService } from './aseguradora.service';
import { AseguradoraDetail, AseguradoraListItem, PaginatedList } from '../models/aseguradora.model';

const BASE = `${environment.api.baseurl}/api/v1/seguros`;

describe('AseguradoraService', () => {
  let service: AseguradoraService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AseguradoraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() omits filter params entirely when not provided', () => {
    service.search({ pageNumber: 1, pageSize: 10 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.has('nombreComercial')).toBeFalse();
    expect(req.request.params.has('codigoIdentificadorNacional')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<AseguradoraListItem>);
  });

  it('search() appends filter params when provided', () => {
    service.search({ pageNumber: 1, pageSize: 10, nombreComercial: 'Pacifico' }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('nombreComercial')).toBe('Pacifico');
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<AseguradoraListItem>);
  });

  it('getById() requests the detail endpoint', () => {
    service.getById('aseg-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/aseg-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as AseguradoraDetail);
  });

  it('create() POSTs the payload', () => {
    const body = { nombreComercial: 'Rimac', codigoIdentificadorNacional: 'RIM-1' };
    service.create(body).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush('new-id');
  });

  it('update() PUTs to the aseguradora-specific endpoint', () => {
    const body = { id: 'aseg-1', nombreComercial: 'Rimac', codigoIdentificadorNacional: 'RIM-1' };
    service.update('aseg-1', body).subscribe();

    const req = httpMock.expectOne(`${BASE}/aseg-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('delete() DELETEs the aseguradora-specific endpoint', () => {
    service.delete('aseg-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/aseg-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('exportar() requests a blob export with the given filters', () => {
    service.exportar(['Nombre comercial'], { nombreComercial: 'Rimac' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Nombre comercial'], nombreComercial: 'Rimac' });
    req.flush(new Blob());
  });
});
