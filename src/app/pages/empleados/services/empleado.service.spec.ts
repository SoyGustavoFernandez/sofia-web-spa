import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { EmpleadoService } from './empleado.service';
import { Empleado, PaginatedList } from '../models/empleado.model';

const BASE = `${environment.api.baseurl}/api/v1/empleados`;

describe('EmpleadoService', () => {
  let service: EmpleadoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() sends every provided name/sucursal filter', () => {
    service
      .search({
        pageNumber: 1,
        pageSize: 10,
        nombres: 'Ana',
        apellidoPaterno: 'Ruiz',
        sucursalNombre: 'Miraflores',
      })
      .subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('nombres')).toBe('Ana');
    expect(req.request.params.get('apellidoPaterno')).toBe('Ruiz');
    expect(req.request.params.get('sucursalNombre')).toBe('Miraflores');
    expect(req.request.params.has('apellidoMaterno')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<Empleado>);
  });

  it('getById() / create() / update() / delete() hit the expected empleado endpoints', () => {
    service.getById('emp-1').subscribe();
    httpMock.expectOne(`${BASE}/emp-1`).flush({} as Empleado);

    const createBody = { sucursal_Base_ID: 'suc-1', nombres: 'Ana', apellido_Paterno: 'Ruiz', apellido_Materno: 'Lopez' };
    service.create(createBody).subscribe();
    const createReq = httpMock.expectOne(BASE);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(createBody);
    createReq.flush('new-id');

    service.update('emp-1', createBody).subscribe();
    const updateReq = httpMock.expectOne(`${BASE}/emp-1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush(null);

    service.delete('emp-1').subscribe();
    const deleteReq = httpMock.expectOne(`${BASE}/emp-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('exportar() requests a blob export with the given filters', () => {
    service.exportar(['Nombres'], { nombres: 'Ana' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Nombres'], nombres: 'Ana' });
    req.flush(new Blob());
  });
});
