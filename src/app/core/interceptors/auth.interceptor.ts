import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@environment/environment';
import { AuthService } from '../auth/auth.service';
import { CHANGE_PASSWORD_ROUTE } from '../auth/password-change.guard';

const PASSWORD_CHANGE_REQUIRED = 'Auth.CambioClaveRequerido';

// The bearer token only goes to our API: never to static assets (/i18n) or any other host
export function isApiRequest(url: string, apiBaseUrl: string = environment.api.baseurl): boolean {
  return url.startsWith(`${apiBaseUrl.replace(/\/+$/, '')}/api/`);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(attachToken(req, auth.token())).pipe(
    catchError(err => {
      // An admin can force the change during a live session; the API then rejects everything else
      if (err instanceof HttpErrorResponse && err.status === 403 && err.error?.code === PASSWORD_CHANGE_REQUIRED) {
        void router.navigate([CHANGE_PASSWORD_ROUTE]);
        return throwError(() => err);
      }
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      // Never retry auth endpoints — avoids infinite loops.
      // For login/register: just propagate the error (don't touch local session).
      // For logout/refresh: clear local session silently without an extra HTTP call.
      if (isAuthEndpoint(req.url)) {
        if (!req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
          auth.clearLocalSession();
        }
        return throwError(() => err);
      }
      return handle401(req, next, auth);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService
): Observable<HttpEvent<unknown>> {
  // AuthService.refreshAccessToken() dedupes concurrent refresh calls internally.
  return auth.refreshAccessToken().pipe(
    switchMap(newToken => next(attachToken(req, newToken))),
    catchError(err => {
      auth.logout();
      return throwError(() => err);
    })
  );
}

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout');
}
