import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '@environment/environment';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { AutocompleteInputComponent } from '@shared/components/autocomplete-input/autocomplete-input.component';
import { CuentaDto } from '../models/cuenta.model';
import { RolResponse } from '../../roles/models/rol.model';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { CuentasDetailComponent } from './cuentas-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/cuentas`;

const CAJERO: RolResponse = { id: 'rol-cajero', nombreRol: 'Cajero', descripcion: null, nivelJerarquia: 3, createdAt: '2026-01-01' };
const QF: RolResponse = { id: 'rol-qf', nombreRol: 'Químico Farmacéutico', descripcion: null, nivelJerarquia: 2, createdAt: '2026-01-01' };

function cuenta(overrides: Partial<CuentaDto> = {}): CuentaDto {
  return {
    id: 'cta-1',
    empleadoId: 'emp-1',
    nombreEmpleado: 'Ana Pérez',
    nombreUsuario: 'aperez',
    cuentaActiva: true,
    requiereCambioClave: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    createdAt: '2026-01-01',
    roles: [],
    sucursales: [],
    ...overrides,
  };
}

const ALL_PERMISSIONS = ['Seguridad:Leer', 'Seguridad:Actualizar', 'Seguridad:Eliminar', 'Seguridad:AsignarRoles'];

function setup(permisos: string[] = ALL_PERMISSIONS) {
  TestBed.configureTestingModule({
    imports: [CuentasDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      importProvidersFrom(
        TranslocoTestingModule.forRoot({
          langs: { es: {}, 'cuentas/es': { roles: { empty: 'Sin roles asignados' } } },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ),
      providePermissions(permisos),
      { provide: ActivatedRoute, useValue: activatedRouteStub({ id: 'cta-1' }) },
    ],
  });
  stubRouterUrl('/cuentas/cta-1');
  const fixture = TestBed.createComponent(CuentasDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock, component: fixture.componentInstance };
}

function loadWith(data: CuentaDto, permisos?: string[]) {
  const ctx = setup(permisos);
  ctx.fixture.detectChanges();
  ctx.httpMock.expectOne(`${BASE}/cta-1`).flush(data);
  ctx.fixture.detectChanges();
  return ctx;
}

function rolInput(fixture: ReturnType<typeof setup>['fixture']): HTMLInputElement {
  const inputs = fixture.debugElement.queryAll(By.css('input[disabled]'));
  return inputs[inputs.length - 1].nativeElement as HTMLInputElement;
}

describe('CuentasDetailComponent — roles', () => {
  it('renders view mode without error and shows the empty-roles text when the account has no role', () => {
    const { fixture, component, httpMock } = loadWith(cuenta());

    expect(component.currentRol()).toBeNull();
    expect(rolInput(fixture).value).toBe('Sin roles asignados');
    httpMock.verify();
  });

  it('shows the role name in view mode when the account has a role', () => {
    const { fixture, component } = loadWith(cuenta({ roles: [CAJERO] }));

    expect(component.currentRol()?.nombreRol).toBe('Cajero');
    expect(rolInput(fixture).value).toBe('Cajero');
  });

  it('passes an empty initialText to the role autocomplete in edit mode when there is no role', () => {
    const { fixture, component } = loadWith(cuenta());

    component.enterEditMode();
    fixture.detectChanges();

    const autocompletes = fixture.debugElement.queryAll(By.directive(AutocompleteInputComponent));
    const rolAutocomplete = autocompletes[0].componentInstance as AutocompleteInputComponent<RolResponse>;
    expect(rolAutocomplete.initialText).toBe('');
  });

  it('save() without a current role only assigns the new one', () => {
    const { component, httpMock } = loadWith(cuenta());
    component.enterEditMode();
    component.onRolSelected(CAJERO);

    component.save();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/cta-1`).flush(null);

    httpMock.expectOne(r => r.method === 'POST' && r.url === `${BASE}/cta-1/roles/${CAJERO.id}`).flush(null);
    httpMock.expectNone(r => r.method === 'DELETE');
    httpMock.expectOne(`${BASE}/cta-1`).flush(cuenta({ roles: [CAJERO] }));
    expect(component.currentRol()?.id).toBe(CAJERO.id);
  });

  it('save() with a different role removes the current role and then assigns the new one', () => {
    const { component, httpMock } = loadWith(cuenta({ roles: [CAJERO] }));
    component.enterEditMode();
    component.onRolSelected(QF);

    component.save();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/cta-1`).flush(null);

    httpMock.expectNone(r => r.method === 'POST');
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === `${BASE}/cta-1/roles/${CAJERO.id}`).flush(null);
    httpMock.expectOne(r => r.method === 'POST' && r.url === `${BASE}/cta-1/roles/${QF.id}`).flush(null);
    httpMock.expectOne(`${BASE}/cta-1`).flush(cuenta({ roles: [QF] }));
    expect(component.currentRol()?.id).toBe(QF.id);
  });

  it('save() with the same role neither removes nor assigns', () => {
    const { component, httpMock } = loadWith(cuenta({ roles: [CAJERO] }));
    component.enterEditMode();
    component.onRolSelected(CAJERO);

    component.save();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/cta-1`).flush(null);

    httpMock.expectNone(r => r.url.includes('/roles/'));
    httpMock.expectOne(`${BASE}/cta-1`).flush(cuenta({ roles: [CAJERO] }));
    expect(component.isEditMode()).toBeFalse();
  });
});

describe('CuentasDetailComponent — action buttons', () => {
  function labels(fixture: ReturnType<typeof setup>['fixture']): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
  }

  it('hides Editar from a user who can only read accounts', () => {
    const { fixture } = loadWith(cuenta({ roles: [CAJERO] }), ['Seguridad:Leer']);

    expect(labels(fixture)).not.toContain('actions.edit');
  });

  it('offers Editar with Seguridad:Actualizar and Eliminar only with Seguridad:Eliminar', () => {
    const { fixture, component } = loadWith(cuenta({ roles: [CAJERO] }), ['Seguridad:Leer', 'Seguridad:Actualizar']);
    expect(labels(fixture)).toContain('actions.edit');

    component.enterEditMode();
    fixture.detectChanges();

    expect(labels(fixture)).toContain('actions.save');
    expect((fixture.nativeElement as HTMLElement).querySelector('.sofia-btn-delete')).toBeNull();
    TestBed.resetTestingModule();

    const conEliminar = loadWith(cuenta({ roles: [CAJERO] }), ['Seguridad:Leer', 'Seguridad:Actualizar', 'Seguridad:Eliminar']);
    conEliminar.component.enterEditMode();
    conEliminar.fixture.detectChanges();

    expect((conEliminar.fixture.nativeElement as HTMLElement).querySelector('.sofia-btn-delete')).not.toBeNull();
  });

  it('keeps the role read-only while editing without Seguridad:AsignarRoles', () => {
    const { fixture, component } = loadWith(cuenta({ roles: [CAJERO] }), ['Seguridad:Leer', 'Seguridad:Actualizar']);

    component.enterEditMode();
    fixture.detectChanges();

    const disabledValues = fixture.debugElement.queryAll(By.css('input[disabled]')).map(i => (i.nativeElement as HTMLInputElement).value);
    expect(fixture.debugElement.queryAll(By.directive(AutocompleteInputComponent)).length).toBe(1);
    expect(disabledValues).toContain('Cajero');
  });

  it('offers the role picker while editing with Seguridad:AsignarRoles', () => {
    const { fixture, component } = loadWith(cuenta({ roles: [CAJERO] }));

    component.enterEditMode();
    fixture.detectChanges();

    const autocompletes = fixture.debugElement.queryAll(By.directive(AutocompleteInputComponent));
    expect(autocompletes.length).toBe(2);
    expect((autocompletes[0].componentInstance as AutocompleteInputComponent<RolResponse>).initialText).toBe('Cajero');
  });
});

describe('CuentasDetailComponent — bloqueo', () => {
  function bloqueadoValue(fixture: ReturnType<typeof setup>['fixture']): string | undefined {
    const field = fixture.debugElement
      .queryAll(By.css('mat-form-field'))
      .find(f => (f.query(By.css('mat-label'))?.nativeElement as HTMLElement | undefined)?.textContent?.trim() === 'cuentas.fields.bloqueado');
    return (field?.query(By.css('input'))?.nativeElement as HTMLInputElement | undefined)?.value;
  }

  it('answers No in the Bloqueado field when the account is not locked', () => {
    const { fixture } = loadWith(cuenta({ bloqueadoHasta: null }));

    expect(bloqueadoValue(fixture)).toBe('generic-labels.no');
  });

  it('answers No once the lock has already expired', () => {
    const { fixture } = loadWith(cuenta({ bloqueadoHasta: '2020-01-01T00:00:00Z' }));

    expect(bloqueadoValue(fixture)).toBe('generic-labels.no');
  });

  it('answers Sí while the lock is still in force', () => {
    const { fixture } = loadWith(cuenta({ bloqueadoHasta: new Date(Date.now() + 3_600_000).toISOString() }));

    expect(bloqueadoValue(fixture)).toBe('generic-labels.yes');
  });
});

describe('CuentasDetailComponent — sucursales', () => {
  const MIRAFLORES: SucursalListItem = {
    id: 'suc-1',
    nombre: 'Miraflores',
    direccionFisica: 'Av. Larco 123',
    numeroLicencia: 'L-1',
    gerenteNombre: null,
  };

  it('lists the assigned sucursales', () => {
    const { fixture } = loadWith(cuenta({ sucursales: [{ id: 'suc-1', nombre: 'Miraflores' }] }));

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Miraflores');
  });

  it('assigns the selected sucursal and reloads the account', () => {
    const { component, httpMock } = loadWith(cuenta());

    component.onSucursalSelected(MIRAFLORES);

    httpMock.expectOne(r => r.method === 'POST' && r.url === `${BASE}/cta-1/sucursales/suc-1`).flush(null);
    httpMock.expectOne(`${BASE}/cta-1`).flush(cuenta({ sucursales: [{ id: 'suc-1', nombre: 'Miraflores' }] }));
    expect(component.entity()?.sucursales.length).toBe(1);
  });

  it('ignores a cleared sucursal selection', () => {
    const { component, httpMock } = loadWith(cuenta());

    component.onSucursalSelected(null);

    httpMock.expectNone(r => r.url.includes('/sucursales/'));
    expect(component.assigningSucursal()).toBeFalse();
  });

  it('removes a sucursal and reloads the account', () => {
    const { component, httpMock } = loadWith(cuenta({ sucursales: [{ id: 'suc-1', nombre: 'Miraflores' }] }));

    component.removeSucursal('suc-1');

    httpMock.expectOne(r => r.method === 'DELETE' && r.url === `${BASE}/cta-1/sucursales/suc-1`).flush(null);
    httpMock.expectOne(`${BASE}/cta-1`).flush(cuenta());
    expect(component.removingSucursalId()).toBeNull();
    expect(component.entity()?.sucursales.length).toBe(0);
  });

  it('excludes already assigned sucursales from the autocomplete results', () => {
    const { component, httpMock } = loadWith(cuenta({ sucursales: [{ id: 'suc-1', nombre: 'Miraflores' }] }));
    let result: SucursalListItem[] = [];

    component.fetchSucursales('').subscribe(items => (result = items));
    httpMock
      .expectOne(r => r.url === `${environment.api.baseurl}/api/v1/sucursales`)
      .flush({ items: [MIRAFLORES, { ...MIRAFLORES, id: 'suc-2', nombre: 'San Isidro' }] });

    expect(result.map(s => s.id)).toEqual(['suc-2']);
  });
});
