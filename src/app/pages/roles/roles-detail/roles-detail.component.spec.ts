import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { PermisoCatalogGroup, PermisoRolDto } from '../models/rol.model';
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

const ES = {
  breadcrumbs: { puntoVenta: 'Punto de Venta' },
  nav: { sesionesCaja: 'Sesiones de Caja', ventas: 'Ventas', lotes: 'Lotes' },
};
const ROLES_ES = {
  permisos: {
    modulo: { POS: 'Sesiones de Caja', Ventas: 'Ventas', Recetas: 'Recetas Médicas' },
    acciones: 'acciones',
    accion: { Leer: 'Leer', AperturarCaja: 'Aperturar caja' },
  },
};

// Loads role "rol-1" with real translations so labels can be asserted as the user reads them
function loadRole(nombreRol: string, catalog: PermisoCatalogGroup[], permisos: Omit<PermisoRolDto, 'id'>[]) {
  TestBed.configureTestingModule({
    imports: [RolesDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      importProvidersFrom(
        TranslocoTestingModule.forRoot({
          langs: { es: ES, 'roles/es': ROLES_ES },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ),
      { provide: ActivatedRoute, useValue: activatedRouteStub({ id: 'rol-1' }) },
    ],
  });
  const fixture = TestBed.createComponent(RolesDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.expectOne(`${BASE}/rol-1`).flush({ id: 'rol-1', nombreRol, descripcion: null, nivelJerarquia: 3, createdAt: '2026-01-01' });
  httpMock.expectOne(`${BASE}/permissions/catalog`).flush(catalog);
  httpMock.expectOne(`${BASE}/rol-1/permissions`).flush(permisos.map((p, i) => ({ ...p, id: `perm-${i}` })));
  httpMock.expectOne(`${BASE}/rol-1/sucursales`).flush([]);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

function visibleRoutes(component: RolesDetailComponent): string[] {
  return component.menuPreview().flatMap(g => g.items.filter(i => i.visible).map(i => i.route));
}

function text(fixture: ComponentFixture<RolesDetailComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
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

describe('RolesDetailComponent — permission labels', () => {
  const CATALOG: PermisoCatalogGroup[] = [
    { modulo: 'Ventas', acciones: ['Leer'] },
    { modulo: 'POS', acciones: ['Leer', 'AperturarCaja'] },
    { modulo: 'ModuloNuevo', acciones: ['AccionNueva'] },
    { modulo: 'Recetas', acciones: ['Leer'] },
  ];

  it('translates module and action names and falls back to the raw name when the API adds a new one', () => {
    const { component } = loadRole('Cajero', CATALOG, []);

    expect(component.moduloLabel('POS')).toBe('Sesiones de Caja');
    expect(component.accionLabel('AperturarCaja')).toBe('Aperturar caja');
    expect(component.moduloLabel('ModuloNuevo')).toBe('ModuloNuevo');
    expect(component.accionLabel('AccionNueva')).toBe('AccionNueva');
  });

  it('orders modules and actions by the label the user reads, not by the backend name', () => {
    const { component } = loadRole('Cajero', CATALOG, []);

    const ordenado = component.permisosCatalogOrdenado();
    expect(ordenado.map(g => g.modulo)).toEqual(['ModuloNuevo', 'Recetas', 'POS', 'Ventas']);
    expect(ordenado[2].acciones).toEqual(['AperturarCaja', 'Leer']);
  });

  it('renders the translated labels in the permissions tab and never a translation key', async () => {
    const { fixture } = loadRole('Cajero', CATALOG, []);

    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    (tabs[1].nativeElement as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const panels = fixture.debugElement.queryAll(By.css('mat-expansion-panel')).map(p => (p.nativeElement as HTMLElement).textContent ?? '');
    expect(panels.length).toBe(4);
    expect(panels[2]).toContain('Sesiones de Caja');
    expect(panels[2]).toContain('Aperturar caja');
    expect(panels[0]).toContain('ModuloNuevo');
    expect(panels[0]).toContain('AccionNueva');
    expect(panels.join(' ')).not.toContain('permisos.');
  });

  it('keeps toggling by the raw backend names, so labels are display-only', () => {
    const { component } = loadRole('Cajero', CATALOG, []);

    component.togglePermiso('POS', 'AperturarCaja');

    expect(component.permisosActivos()).toEqual([{ id: '', moduloSistema: 'POS', accion: 'AperturarCaja' }]);
  });
});

describe('RolesDetailComponent — permission management', () => {
  const CATALOG: PermisoCatalogGroup[] = [{ modulo: 'Ventas', acciones: ['Leer', 'Crear'] }];

  function loadWith(permisos: string[]) {
    TestBed.configureTestingModule({
      imports: [RolesDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslocoTesting(),
        providePermissions(permisos),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ id: 'rol-1' }) },
      ],
    });
    stubRouterUrl('/roles/rol-1');
    const fixture = TestBed.createComponent(RolesDetailComponent);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/rol-1`).flush({ id: 'rol-1', nombreRol: 'Cajero', descripcion: null, nivelJerarquia: 3, createdAt: '2026-01-01' });
    httpMock.expectOne(`${BASE}/permissions/catalog`).flush(CATALOG);
    httpMock.expectOne(`${BASE}/rol-1/permissions`).flush([{ id: 'perm-1', moduloSistema: 'Ventas', accion: 'Leer' }]);
    httpMock.expectOne(`${BASE}/rol-1/sucursales`).flush([{ id: 'suc-1', nombre: 'Miraflores', asignada: false }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, httpMock };
  }

  function labels(fixture: ComponentFixture<RolesDetailComponent>): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
  }

  // Sucursales tab: its checkboxes are the ones the role's branches are managed with
  async function sucursalCheckboxes(fixture: ComponentFixture<RolesDetailComponent>): Promise<HTMLInputElement[]> {
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    (tabs[2].nativeElement as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.debugElement.queryAll(By.css('mat-checkbox input')).map(c => c.nativeElement as HTMLInputElement);
  }

  it('hides Editar from a user who can only read roles', () => {
    const { fixture } = loadWith(['Seguridad:Leer']);

    expect(labels(fixture)).not.toContain('actions.edit');
  });

  it('offers Editar with Seguridad:Actualizar and Eliminar only with Seguridad:Eliminar', () => {
    const { fixture, component } = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar']);
    expect(labels(fixture)).toContain('actions.edit');

    component.enterEditMode();
    fixture.detectChanges();

    expect(labels(fixture)).toContain('actions.save');
    expect((fixture.nativeElement as HTMLElement).querySelector('.sofia-btn-delete')).toBeNull();
    TestBed.resetTestingModule();

    const conEliminar = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar', 'Seguridad:Eliminar']);
    conEliminar.component.enterEditMode();
    conEliminar.fixture.detectChanges();

    expect((conEliminar.fixture.nativeElement as HTMLElement).querySelector('.sofia-btn-delete')).not.toBeNull();
  });

  it('keeps permissions and branches read-only while editing without Seguridad:GestionarPermisos', async () => {
    const { fixture, component } = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar']);
    component.enterEditMode();
    fixture.detectChanges();

    const checkboxes = await sucursalCheckboxes(fixture);

    expect(component.puedeGestionarPermisos()).toBeFalse();
    expect(checkboxes.length).toBe(1);
    expect(checkboxes.every(c => c.disabled)).toBeTrue();
  });

  it('enables permissions and branches while editing with Seguridad:GestionarPermisos', async () => {
    const { fixture, component } = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar', 'Seguridad:GestionarPermisos']);
    component.enterEditMode();
    fixture.detectChanges();

    const checkboxes = await sucursalCheckboxes(fixture);

    expect(checkboxes.length).toBe(1);
    expect(checkboxes.every(c => !c.disabled)).toBeTrue();
  });

  it('save() updates only the role data when the user cannot manage permissions', () => {
    const { component, httpMock } = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar']);
    component.enterEditMode();

    component.save();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/rol-1`).flush(null);

    httpMock.expectNone(r => r.method === 'PUT' && r.url === `${BASE}/rol-1/sucursales`);
    httpMock.expectNone(r => r.url.startsWith(`${BASE}/permissions`) && r.method !== 'GET');
    expect(component.isEditMode()).toBeFalse();
  });

  it('save() also sends branches and permission changes when the user can manage permissions', () => {
    const { component, httpMock } = loadWith(['Seguridad:Leer', 'Seguridad:Actualizar', 'Seguridad:GestionarPermisos']);
    component.enterEditMode();
    component.toggleSucursal('suc-1');
    component.togglePermiso('Ventas', 'Crear');
    component.togglePermiso('Ventas', 'Leer');

    component.save();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/rol-1`).flush(null);

    const sucursales = httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/rol-1/sucursales`);
    expect(sucursales.request.body).toEqual({ sucursalIds: ['suc-1'] });
    sucursales.flush(null);
    const assign = httpMock.expectOne(r => r.method === 'POST' && r.url === `${BASE}/permissions`);
    expect(assign.request.body).toEqual({ rolId: 'rol-1', moduloSistema: 'Ventas', accion: 'Crear' });
    assign.flush({ id: 'perm-2' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === `${BASE}/permissions/perm-1`).flush(null);
    expect(component.isEditMode()).toBeFalse();
  });
});

describe('RolesDetailComponent — menu preview', () => {
  it('marks a screen visible only when the role can read its module, like the sidebar does', () => {
    const { component } = loadRole('Cajero', [], [
      { moduloSistema: 'Ventas', accion: 'Leer' },
      { moduloSistema: 'POS', accion: 'AperturarCaja' },
      { moduloSistema: 'Inventarios', accion: 'Crear' },
    ]);

    expect(visibleRoutes(component)).toEqual(['/dashboard', '/pos']);
  });

  it('updates as permissions are toggled, before saving', () => {
    const { component } = loadRole('Cajero', [], []);

    component.togglePermiso('POS', 'Leer');
    component.togglePermiso('Inventarios', 'Leer');

    expect(visibleRoutes(component)).toEqual(['/dashboard', '/lotes', '/stock-por-sucursal', '/sesiones-caja']);
  });

  it('shows every screen for the Admin role, which the API lets through without permissions', () => {
    const { component } = loadRole('Admin', [], []);

    const items = component.menuPreview().flatMap(g => g.items);
    expect(items.length).toBeGreaterThan(1);
    expect(items.every(i => i.visible)).toBeTrue();
  });

  it('renders the same translated group and screen names as the sidebar', () => {
    const { fixture } = loadRole('Cajero', [], [{ moduloSistema: 'Ventas', accion: 'Leer' }]);

    const content = text(fixture);
    expect(content).toContain('Punto de Venta');
    expect(content).toContain('Sesiones de Caja');
    expect(content).toContain('Ventas');
  });
});
