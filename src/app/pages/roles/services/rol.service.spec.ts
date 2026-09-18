import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { RolService } from './rol.service';
import { PaginatedList, RolResponse } from '../models/rol.model';

const BASE = `${environment.api.baseurl}/api/v1/roles`;

describe('RolService', () => {
  let service: RolService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() only appends nivelJerarquia filters when explicitly not null/undefined', () => {
    service.search({ pageNumber: 1, pageSize: 10, nivelJerarquiaDesde: 0 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('nivelJerarquiaDesde')).toBe('0');
    expect(req.request.params.has('nivelJerarquiaHasta')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<RolResponse>);
  });

  it('getById() / create() / update() / delete() hit the expected role endpoints', () => {
    service.getById('rol-1').subscribe();
    httpMock.expectOne(`${BASE}/rol-1`).flush({} as RolResponse);

    service.create({ nombreRol: 'Cajero', nivelJerarquia: 3 }).subscribe();
    const createReq = httpMock.expectOne(BASE);
    expect(createReq.request.method).toBe('POST');
    createReq.flush('new-id');

    service.update('rol-1', { descripcion: 'x', nivelJerarquia: 4 }).subscribe();
    const updateReq = httpMock.expectOne(`${BASE}/rol-1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush(null);

    service.delete('rol-1').subscribe();
    const deleteReq = httpMock.expectOne(`${BASE}/rol-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });

  it('exportar() requests a blob export', () => {
    service.exportar(['Rol'], { nombreRol: 'Cajero' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Rol'], nombreRol: 'Cajero' });
    req.flush(new Blob());
  });

  it('getPermissionsCatalog() GETs the permissions catalog', () => {
    service.getPermissionsCatalog().subscribe();

    const req = httpMock.expectOne(`${BASE}/permissions/catalog`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getPermisos()/assignPermiso()/revokePermiso() manage a role permission', () => {
    service.getPermisos('rol-1').subscribe();
    httpMock.expectOne(`${BASE}/rol-1/permissions`).flush([]);

    service.assignPermiso('rol-1', 'Lotes', 'Crear').subscribe();
    const assignReq = httpMock.expectOne(`${BASE}/permissions`);
    expect(assignReq.request.method).toBe('POST');
    expect(assignReq.request.body).toEqual({ rolId: 'rol-1', moduloSistema: 'Lotes', accion: 'Crear' });
    assignReq.flush({ id: 'perm-1' });

    service.revokePermiso('perm-1').subscribe();
    const revokeReq = httpMock.expectOne(`${BASE}/permissions/perm-1`);
    expect(revokeReq.request.method).toBe('DELETE');
    revokeReq.flush(null);
  });

  it('getSucursales()/setSucursales() manage the role-sucursal assignment', () => {
    service.getSucursales('rol-1').subscribe();
    httpMock.expectOne(`${BASE}/rol-1/sucursales`).flush([]);

    service.setSucursales('rol-1', ['suc-1', 'suc-2']).subscribe();
    const setReq = httpMock.expectOne(`${BASE}/rol-1/sucursales`);
    expect(setReq.request.method).toBe('PUT');
    expect(setReq.request.body).toEqual({ sucursalIds: ['suc-1', 'suc-2'] });
    setReq.flush(null);
  });
});
