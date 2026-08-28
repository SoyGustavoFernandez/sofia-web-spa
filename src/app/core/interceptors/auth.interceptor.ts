import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

// Module-level state shared across all interceptor invocations in the SPA
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(attachToken(req, auth.token())).pipe(
    catchError(err => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      // Never retry auth endpoints — avoids infinite loops
      if (isAuthEndpoint(req.url)) {
        auth.logout();
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
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return auth.refreshAccessToken().pipe(
      switchMap(newToken => {
        isRefreshing = false;
        refreshSubject.next(newToken);
        return next(attachToken(req, newToken));
      }),
      catchError(err => {
        isRefreshing = false;
        auth.logout();
        return throwError(() => err);
      })
    );
  }

  // Queue concurrent requests until the ongoing refresh completes
  return refreshSubject.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap(token => next(attachToken(req, token)))
  );
}

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout');
}
