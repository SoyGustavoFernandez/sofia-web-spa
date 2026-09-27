import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { SesionCajaService } from './sesion-caja.service';
import { EstadoSesion, PaginatedList, SesionCaja } from '../models/sesion-caja.model';

const BASE = `${environment.api.baseurl}/api/v1/pos`;
const EMPTY_PAGE: PaginatedList<SesionCaja> = { items: [], pageNumber: 1, totalPages: 0, totalCount: 0 };

describe('SesionCajaService', () => {
  let service: SesionCajaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SesionCajaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() narrows to the cashier own open session when empleadoId is given', () => {
    service.search({ sucursalId: 'suc-1', empleadoId: 'emp-1', estadoSesion: EstadoSesion.Abierta, pageNumber: 1, pageSize: 1 }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${BASE}/sesiones`);
    expect(req.request.params.get('empleadoId')).toBe('emp-1');
    expect(req.request.params.get('sucursalId')).toBe('suc-1');
    expect(req.request.params.get('estadoSesion')).toBe('0');
    req.flush(EMPTY_PAGE);
  });

  it('search() omits empleadoId when it is not given', () => {
    service.search({ pageNumber: 1, pageSize: 10 }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${BASE}/sesiones`);
    expect(req.request.params.has('empleadoId')).toBe(false);
    req.flush(EMPTY_PAGE);
  });
});
