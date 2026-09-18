import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'isAuthenticated' | 'refreshAccessToken' | 'clearLocalSession'>>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'refreshAccessToken', 'clearLocalSession']);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  }

  it('allows navigation immediately when the local token is valid', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const result = runGuard();

    expect(result).toBeTrue();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('attempts a silent refresh when the local token is stale, and allows navigation on success', done => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.refreshAccessToken.and.returnValue(of('new-token'));

    const result = runGuard();
    expect(result).not.toBe(true);

    (result as Observable<boolean>).subscribe(value => {
      expect(value).toBeTrue();
      expect(authServiceSpy.clearLocalSession).not.toHaveBeenCalled();
      done();
    });
  });

  it('clears the session and redirects to /auth/login when the silent refresh fails', done => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('refresh failed')));
    const expectedTree = router.createUrlTree(['/auth/login']);
    spyOn(router, 'createUrlTree').and.returnValue(expectedTree);

    const result = runGuard();

    (result as Observable<boolean | UrlTree>).subscribe(value => {
      expect(authServiceSpy.clearLocalSession).toHaveBeenCalled();
      expect(value).toBe(expectedTree);
      done();
    });
  });
});
