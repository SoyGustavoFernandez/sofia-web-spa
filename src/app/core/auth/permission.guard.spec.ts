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

  it('fails closed and informs the user when permissions cannot be loaded', done => {
    authServiceSpy.loadPermissions.and.returnValue(throwError(() => new Error('network')));

    (runGuard('/pos') as Observable<boolean | UrlTree>).subscribe(result => {
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(notifierSpy.showError).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
