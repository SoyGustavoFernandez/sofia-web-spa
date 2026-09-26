import { inject } from '@angular/core';
import { CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, map, of, take } from 'rxjs';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { AuthService } from './auth.service';
import { routeModule } from './route-permissions';

// Blocks shell routes the user cannot read; the API still enforces every call, this keeps the UI honest.
export const permissionGuard: CanActivateChildFn = (_childRoute, state) => {
  const modulo = routeModule(state.url);
  if (!modulo) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const notifier = inject(ErrorNotifierService);
  const transloco = inject(TranslocoService);

  // selectTranslate: on a direct URL load the guard runs before the root i18n bundle is ready
  const deny = (messageKey: string): UrlTree => {
    transloco.selectTranslate(messageKey).pipe(take(1)).subscribe(message => notifier.showError(message));
    return router.createUrlTree(['/dashboard']);
  };

  return auth.loadPermissions().pipe(
    map(() => auth.hasPermission(modulo) || deny('errors.forbiddenPage')),
    catchError(() => of(deny('errors.permissionsLoad'))),
  );
};
