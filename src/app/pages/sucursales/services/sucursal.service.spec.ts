import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { SucursalService } from './sucursal.service';
import { SucursalPermitida } from '../models/sucursal.model';

describe('SucursalService', () => {
  let service: SucursalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SucursalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getPermitidas() GETs the branches the user may operate on', () => {
    const permitidas: SucursalPermitida[] = [{ id: 's1', nombre: 'Sede A' }];
    let result: SucursalPermitida[] = [];

    service.getPermitidas().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${environment.api.baseurl}/api/v1/sucursales/permitidas`);
    expect(req.request.method).toBe('GET');
    req.flush(permitidas);
    expect(result).toEqual(permitidas);
  });
});
