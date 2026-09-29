import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const CHANGE_PASSWORD_ROUTE = '/cambiar-clave';

// While the account must change its password the API rejects everything else, so keep the user on that page
export const passwordChangeGuard: CanActivateChildFn = (_childRoute, state) => {
  const auth = inject(AuthService);
  if (!auth.requiresPasswordChange() || state.url.startsWith(CHANGE_PASSWORD_ROUTE)) return true;
  return inject(Router).createUrlTree([CHANGE_PASSWORD_ROUTE]);
};
