import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { RolesDetailComponent } from './roles-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/roles`;

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [RolesDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: activatedRouteStub(routeParams) },
    ],
  });
  return {
    fixture: TestBed.createComponent(RolesDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('RolesDetailComponent — /nueva (create mode)', () => {
  it('opens in edit mode without loading role/permission/sucursal data', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isNew()).toBeTrue();
    expect(component.isEditMode()).toBeTrue();
    expect(component.form.enabled).toBeTrue();
    httpMock.expectNone(r => r.url === BASE);
  });
});

describe('RolesDetailComponent — /:id (view mode)', () => {
  it('loads the role plus its permissions and sucursales in parallel', () => {
    const { fixture, httpMock } = setup({ id: 'rol-1' });
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/rol-1`).flush({
      id: 'rol-1',
      nombreRol: 'Cajero',
      descripcion: 'Atiende ventas',
      nivelJerarquia: 3,
      createdAt: '2026-01-01',
    });
    httpMock.expectOne(`${BASE}/permissions/catalog`).flush([{ modulo: 'Lotes', acciones: ['Ver', 'Crear'] }]);
    httpMock.expectOne(`${BASE}/rol-1/permissions`).flush([{ id: 'perm-1', moduloSistema: 'Lotes', accion: 'Ver' }]);
    httpMock.expectOne(`${BASE}/rol-1/sucursales`).flush([{ id: 'suc-1', nombre: 'Miraflores', asignada: true }]);

    const component = fixture.componentInstance;
    expect(component.isEditMode()).toBeFalse();
    expect(component.form.disabled).toBeTrue();
    expect(component.form.value.nombreRol).toBe('Cajero');
    expect(component.isPermisoActivo('Lotes', 'Ver')).toBeTrue();
    expect(component.sucursales().length).toBe(1);
    httpMock.verify();
  });
});
