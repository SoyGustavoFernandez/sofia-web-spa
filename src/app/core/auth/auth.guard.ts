import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;

  // Local token expired — try a silent refresh before redirecting to login.
  return auth.refreshAccessToken().pipe(
    map(() => true),
    catchError(() => {
      auth.clearLocalSession();
      return of(router.createUrlTree(['/auth/login']));
    })
  );
};
