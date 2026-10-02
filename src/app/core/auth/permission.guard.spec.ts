import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService, UserProfile } from './auth.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'loadPermissions' | 'hasPermission'>>;
  let notifierSpy: jasmine.SpyObj<Pick<ErrorNotifierService, 'showError'>>;
  let router: Router;
  const profile: UserProfile = { roles: ['Cajero'], permisos: [] };

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['loadPermissions', 'hasPermission']);
    notifierSpy = jasmine.createSpyObj('ErrorNotifierService', ['showError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ErrorNotifierService, useValue: notifierSpy },
        provideTranslocoTesting(),
      ],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() => permissionGuard({} as never, { url } as RouterStateSnapshot));
  }

  it('allows routes without a mapped module (dashboard) without loading permissions', () => {
    expect(runGuard('/dashboard')).toBeTrue();
    expect(authServiceSpy.loadPermissions).not.toHaveBeenCalled();
  });

  it('allows a nested route when the user can read its module', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.returnValue(true);

    (runGuard('/sucursales/123?tab=1') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(result).toBeTrue();
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Sucursales');
      done();
    });
  });

  it('redirects to the dashboard with a message when the user lacks the module', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.returnValue(false);

    (runGuard('/roles') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Seguridad');
      expect(notifierSpy.showError).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('blocks the prescription scanner for a user who can read prescriptions but not analyze them', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion !== 'Analizar');

    (runGuard('/recetas-medicas/escanear') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Recetas', 'Analizar');
      expect(notifierSpy.showError).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('opens the prescription scanner when the user can read and analyze prescriptions', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.returnValue(true);

    (runGuard('/recetas-medicas/escanear') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(result).toBeTrue();
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Recetas', 'Analizar');
      done();
    });
  });

  it('keeps the other prescription routes open with read access only', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion === undefined);

    (runGuard('/recetas-medicas/abc-123') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(result).toBeTrue();
      expect(notifierSpy.showError).not.toHaveBeenCalled();
      done();
    });
  });

  for (const url of ['/laboratorios/nueva', '/laboratorios/nuevo', '/laboratorios/carga-masiva', '/laboratorios/nueva;a=1', '/pos/nueva?continuar=9']) {
    it(`blocks ${url} for a user who can read the module but not create in it`, done => {
      authServiceSpy.loadPermissions.and.returnValue(of(profile));
      authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion !== 'Crear');

      (runGuard(url) as Observable<boolean | UrlTree>).subscribe(result => {
        expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
        expect(authServiceSpy.hasPermission).toHaveBeenCalledWith(url.startsWith('/pos') ? 'Ventas' : 'Laboratorios', 'Crear');
        expect(notifierSpy.showError).toHaveBeenCalledTimes(1);
        done();
      });
    });
  }

  it('opens the create form when the user can read and create in the module', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.returnValue(true);

    (runGuard('/laboratorios/nueva') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(result).toBeTrue();
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Laboratorios', 'Crear');
      done();
    });
  });

  it('keeps the search and detail routes open with read access only', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion === undefined);

    (runGuard('/laboratorios') as Observable<boolean | UrlTree>).subscribe(search => {
      (runGuard('/laboratorios/abc-123') as Observable<boolean | UrlTree>).subscribe(detail => {
        expect(search).toBeTrue();
        expect(detail).toBeTrue();
        expect(notifierSpy.showError).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('asks for AperturarCaja, not Crear, to open the new cash session form', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion !== 'AperturarCaja');

    (runGuard('/sesiones-caja/nueva') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('POS', 'AperturarCaja');
      done();
    });
  });

  it('asks for Inventarios:Actualizar, not Crear, to open the new stock form', done => {
    authServiceSpy.loadPermissions.and.returnValue(of(profile));
    authServiceSpy.hasPermission.and.callFake((_modulo: string, accion?: string) => accion !== 'Actualizar');

    (runGuard('/stock-por-sucursal/nueva') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('Inventarios', 'Actualizar');
      done();
    });
  });

  it('fails closed and informs the user when permissions cannot be loaded', done => {
    authServiceSpy.loadPermissions.and.returnValue(throwError(() => new Error('network')));

    (runGuard('/pos') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(notifierSpy.showError).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
