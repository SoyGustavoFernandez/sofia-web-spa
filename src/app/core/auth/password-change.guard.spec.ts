import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { passwordChangeGuard } from './password-change.guard';
import { AuthService } from './auth.service';

describe('passwordChangeGuard', () => {
  const requiresPasswordChange = signal(false);
  let router: Router;

  beforeEach(() => {
    requiresPasswordChange.set(false);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { requiresPasswordChange } }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      passwordChangeGuard({} as never, { url } as RouterStateSnapshot));
  }

  it('allows any route when no password change is pending', () => {
    expect(runGuard('/ventas')).toBeTrue();
  });

  it('redirects other routes to the change password page while a change is pending', () => {
    requiresPasswordChange.set(true);

    const result = runGuard('/dashboard');

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/cambiar-clave');
  });

  it('allows the change password page while a change is pending', () => {
    requiresPasswordChange.set(true);

    expect(runGuard('/cambiar-clave')).toBeTrue();
  });
});
