import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { DashboardService } from './dashboard.service';

const BASE = `${environment.api.baseurl}/api/v1/dashboard`;
const HOY = '2026-10-02T05:00:00.000Z';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ventas() sends the start of the local day as hoy', () => {
    service.ventas(HOY).subscribe();

    const req = httpMock.expectOne(r => r.url === `${BASE}/ventas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('hoy')).toBe(HOY);
    req.flush({});
  });

  it('inventario() sends hoy so the expiry buckets follow the local day', () => {
    service.inventario(HOY).subscribe();

    const req = httpMock.expectOne(r => r.url === `${BASE}/inventario`);
    expect(req.request.params.get('hoy')).toBe(HOY);
    req.flush({});
  });

  it('devoluciones() sends hoy', () => {
    service.devoluciones(HOY).subscribe();

    const req = httpMock.expectOne(r => r.url === `${BASE}/devoluciones`);
    expect(req.request.params.get('hoy')).toBe(HOY);
    req.flush({});
  });

  it('caja() and cuarentena() need no day', () => {
    service.caja().subscribe();
    service.cuarentena().subscribe();

    const caja = httpMock.expectOne(`${BASE}/caja`);
    const cuarentena = httpMock.expectOne(`${BASE}/cuarentena`);
    expect(caja.request.params.keys()).toEqual([]);
    expect(cuarentena.request.params.keys()).toEqual([]);
    caja.flush({});
    cuarentena.flush({});
  });
});
