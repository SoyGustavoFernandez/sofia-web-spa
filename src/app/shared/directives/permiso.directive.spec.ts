import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@environment/environment';
import { AuthService, UserPermission } from '@core/auth/auth.service';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { PermisoDirective } from './permiso.directive';

const ME = `${environment.api.baseurl}/api/v1/auth/me`;
const TOKEN_KEY = 'sofia_token';

@Component({
  standalone: true,
  imports: [PermisoDirective],
  template: `
    <button id="crear" *appPermiso="'Crear'">Nuevo</button>
    <button id="devolver" *appPermiso="'Devoluciones:ProcesarDevolucion'">Devolver</button>
    @if (editing) {
      <ng-container *appPermiso="'Eliminar'">
        <button id="eliminar">Eliminar</button>
      </ng-container>
    }
  `,
})
class HostComponent {
  editing = true;
}

// Unsigned JWT with just the claims AuthService reads
function buildJwt(sub: string): string {
  const base64url = (obj: unknown): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub })}.signature`;
}

describe('PermisoDirective', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  function grant(permisos: UserPermission[], roles: string[] = ['Cajero']): void {
    auth.loadPermissions().subscribe();
    httpMock.expectOne(ME).flush({ roles, permisos });
  }

  function render(url: string): ComponentFixture<HostComponent> {
    stubRouterUrl(url);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function shown(fixture: ComponentFixture<HostComponent>): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.id);
  }

  it('resolves the module of an action-only permission from the current route', () => {
    grant([{ modulo: 'Laboratorios', accion: 'Crear' }]);

    expect(shown(render('/laboratorios?page=2'))).toEqual(['crear']);
  });

  it('hides an action the user holds on a module other than the one of the current route', () => {
    grant([{ modulo: 'Laboratorios', accion: 'Crear' }]);

    expect(shown(render('/proveedores'))).toEqual([]);
  });

  it('checks an explicit Modulo:Accion against that module, whatever the current route is', () => {
    grant([{ modulo: 'Devoluciones', accion: 'ProcesarDevolucion' }]);

    expect(shown(render('/pos/venta-1'))).toEqual(['devolver']);
  });

  it('hides every action from a user who can only read the module', () => {
    grant([{ modulo: 'Ventas', accion: 'Leer' }, { modulo: 'Devoluciones', accion: 'Leer' }]);

    expect(shown(render('/pos/venta-1'))).toEqual([]);
  });

  it('renders the template once when wrapped in an ng-container inside an @if block', () => {
    grant([{ modulo: 'Recetas', accion: 'Eliminar' }]);
    const fixture = render('/recetas-medicas/rec-1');
    fixture.detectChanges();

    expect(shown(fixture)).toEqual(['eliminar']);

    fixture.componentInstance.editing = false;
    fixture.detectChanges();

    expect(shown(fixture)).toEqual([]);
  });

  it('shows everything to an administrator without explicit permissions', () => {
    grant([], ['Admin']);

    expect(shown(render('/recetas-medicas/rec-1'))).toEqual(['crear', 'devolver', 'eliminar']);
  });

  it('fails closed on a route without a mapped module, even for an administrator', () => {
    grant([], ['Admin']);

    expect(shown(render('/dashboard'))).toEqual(['devolver']);
  });

  it('stays hidden until the profile loads and appears once it does', () => {
    const fixture = render('/laboratorios');

    expect(shown(fixture)).toEqual([]);

    grant([{ modulo: 'laboratorios ', accion: 'crear' }]);
    fixture.detectChanges();

    expect(shown(fixture)).toEqual(['crear']);
  });

  it('hides the actions again when the session ends', () => {
    grant([], ['Admin']);
    const fixture = render('/laboratorios');

    auth.clearLocalSession();
    fixture.detectChanges();

    expect(shown(fixture)).toEqual([]);
  });

  it('follows the permissions of the new user after a user switch', () => {
    auth.storeToken(buildJwt('admin'));
    grant([], ['Admin']);
    const fixture = render('/laboratorios');

    auth.storeToken(buildJwt('cajero'));
    fixture.detectChanges();

    expect(shown(fixture)).toEqual([]);

    grant([{ modulo: 'Laboratorios', accion: 'Eliminar' }]);
    fixture.detectChanges();

    expect(shown(fixture)).toEqual(['eliminar']);
  });
});
