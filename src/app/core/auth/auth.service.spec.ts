import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '@environment/environment';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { AuthService } from './auth.service';
import { MENU_CACHE_PREFIX, POS_DRAFT_PREFIX, userStorageKey } from './user-storage';

const AUTH_BASE = `${environment.api.baseurl}/api/v1/auth`;
const TOKEN_KEY = 'sofia_token';
const DEVICE_PREF_KEY = 'sofia_timezone_test';

/** Builds a syntactically valid (unsigned) JWT carrying the given payload, for decoding tests. */
function buildJwt(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(payload)}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(userStorageKey(POS_DRAFT_PREFIX, 'u1'));
    localStorage.removeItem(userStorageKey(MENU_CACHE_PREFIX, 'u1'));
    localStorage.removeItem(DEVICE_PREF_KEY);
  });

  function createService(): void {
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  it('starts unauthenticated with no token in localStorage', () => {
    createService();
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('loads a pre-existing token from localStorage on construction', () => {
    const token = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 });
    localStorage.setItem(TOKEN_KEY, token);

    createService();

    expect(service.token()).toBe(token);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('treats a token with a past exp as not authenticated', () => {
    const token = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 3600 });
    localStorage.setItem(TOKEN_KEY, token);

    createService();

    expect(service.isAuthenticated()).toBeFalse();
  });

  it('treats a token with no exp claim as authenticated', () => {
    const token = buildJwt({ sub: 'u1' });
    localStorage.setItem(TOKEN_KEY, token);

    createService();

    expect(service.isAuthenticated()).toBeTrue();
  });

  it('falls back to null payload for a malformed token instead of throwing', () => {
    localStorage.setItem(TOKEN_KEY, 'not-a-jwt');

    createService();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('login() stores the returned access token and updates the signal', () => {
    createService();
    const token = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 });

    service.login({ nombreUsuario: 'demo', password: 'secret' }).subscribe();

    const req = httpMock.expectOne(`${AUTH_BASE}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ accessToken: token });

    expect(service.token()).toBe(token);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it('exposes empresaId and sucursalId from the decoded payload', () => {
    createService();
    const token = buildJwt({
      sub: 'u1',
      exp: Math.floor(Date.now() / 1000) + 3600,
      empresaId: 'emp-1',
      sucursalId: 'suc-2',
    });
    service.storeToken(token);

    expect(service.empresaId()).toBe('emp-1');
    expect(service.sucursalId()).toBe('suc-2');
  });

  it('loadPermissions() fetches /auth/me once and reuses it for later calls', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.loadPermissions().subscribe();
    service.loadPermissions().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush({ roles: ['Cajero'], permisos: [] });
    service.loadPermissions().subscribe();

    httpMock.expectNone(`${AUTH_BASE}/me`);
  });

  it('hasPermission() matches module and action case-insensitively and defaults to Leer', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.loadPermissions().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush({
      roles: ['Cajero'],
      permisos: [{ modulo: 'ventas', accion: 'leer' }, { modulo: 'POS', accion: 'AperturarCaja' }],
    });

    expect(service.hasPermission('Ventas')).toBeTrue();
    expect(service.hasPermission('POS', 'AperturarCaja')).toBeTrue();
    expect(service.hasPermission('POS')).toBeFalse();
    expect(service.hasPermission('Seguridad')).toBeFalse();
  });

  it('hasPermission() lets the Admin role through every module, like the API does', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.loadPermissions().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush({ roles: ['admin'], permisos: [] });

    expect(service.hasPermission('Seguridad', 'GestionarPermisos')).toBeTrue();
  });

  it('hasPermission() denies everything until permissions are loaded', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    expect(service.hasPermission('Ventas')).toBeFalse();
  });

  it('clearLocalSession() forgets permissions so the next user loads their own', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    service.loadPermissions().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush({ roles: ['Admin'], permisos: [] });

    service.clearLocalSession();

    expect(service.hasPermission('Ventas')).toBeFalse();
  });

  it('storeToken() for a different user drops the previous user permissions', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    service.loadPermissions().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush({ roles: ['Admin'], permisos: [] });

    service.storeToken(buildJwt({ sub: 'u2', exp: Math.floor(Date.now() / 1000) + 3600 }));

    expect(service.hasPermission('Ventas')).toBeFalse();
  });

  it('loadPermissions() discards a response that arrives after the user logged out', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    service.loadPermissions().subscribe();
    const pending = httpMock.expectOne(`${AUTH_BASE}/me`);

    service.clearLocalSession();
    pending.flush({ roles: ['Admin'], permisos: [] });

    expect(service.hasPermission('Ventas')).toBeFalse();
  });

  it('refreshAccessToken() dedupes concurrent calls into a single HTTP request', () => {
    createService();
    const token = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 });

    let first: string | undefined;
    let second: string | undefined;
    service.refreshAccessToken().subscribe(t => (first = t));
    service.refreshAccessToken().subscribe(t => (second = t));

    const reqs = httpMock.match(`${AUTH_BASE}/refresh`);
    expect(reqs.length).toBe(1);
    reqs[0].flush({ accessToken: token });

    expect(first).toBe(token);
    expect(second).toBe(token);
    expect(service.token()).toBe(token);
  });

  it('refreshAccessToken() allows a new request once the previous one completed', () => {
    createService();
    const tokenA = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 });
    const tokenB = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 7200 });

    service.refreshAccessToken().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/refresh`).flush({ accessToken: tokenA });

    service.refreshAccessToken().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/refresh`).flush({ accessToken: tokenB });

    expect(service.token()).toBe(tokenB);
  });

  it('refreshAccessToken() and logout() send the anti-CSRF header the API requires', () => {
    createService();

    service.refreshAccessToken().subscribe();
    const refresh = httpMock.expectOne(`${AUTH_BASE}/refresh`);
    expect(refresh.request.headers.get('X-SOFIA-CSRF')).toBe('1');
    refresh.flush({ accessToken: buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }) });

    service.logout();
    const logout = httpMock.expectOne(`${AUTH_BASE}/logout`);
    expect(logout.request.headers.get('X-SOFIA-CSRF')).toBe('1');
    logout.flush({});
  });

  it("login() removes other users' POS drafts but keeps the signed-in user's own", () => {
    createService();
    const ownDraft = userStorageKey(POS_DRAFT_PREFIX, 'u1');
    const otherDraft = userStorageKey(POS_DRAFT_PREFIX, 'u9');
    localStorage.setItem(ownDraft, '{}');
    localStorage.setItem(otherDraft, '{}');

    service.login({ nombreUsuario: 'demo', password: 'secret' }).subscribe();
    httpMock.expectOne(`${AUTH_BASE}/login`).flush({ accessToken: buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }) });

    expect(localStorage.getItem(ownDraft)).toBe('{}');
    expect(localStorage.getItem(otherDraft)).toBeNull();
    localStorage.removeItem(otherDraft);
  });

  it('logout() clears local session, best-effort calls the server, and navigates to login', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.logout();
    httpMock.expectOne(`${AUTH_BASE}/logout`).flush({});

    expect(service.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('logout() still clears local session even if the server call fails', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.logout();
    httpMock.expectOne(`${AUTH_BASE}/logout`).error(new ProgressEvent('network error'));

    expect(service.token()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('logout() with an expired token still sends the refresh cookie and navigates only after the server answers', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 60 }));

    service.logout();
    const req = httpMock.expectOne(`${AUTH_BASE}/logout`);

    expect(req.request.withCredentials).toBeTrue();
    expect(service.token()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();

    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('clearLocalSession() removes the token without calling the server or navigating', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.clearLocalSession();

    expect(service.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('exposes userId from the sub claim', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    expect(service.userId()).toBe('u1');
  });

  it('logout() wipes per-user drafts and caches but keeps device preferences', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem(userStorageKey(POS_DRAFT_PREFIX, 'u1'), '{"cart":[1]}');
    localStorage.setItem(userStorageKey(MENU_CACHE_PREFIX, 'u1'), '{}');
    localStorage.setItem(DEVICE_PREF_KEY, 'America/Lima');

    service.logout();
    httpMock.expectOne(`${AUTH_BASE}/logout`).flush({});

    expect(localStorage.getItem(userStorageKey(POS_DRAFT_PREFIX, 'u1'))).toBeNull();
    expect(localStorage.getItem(userStorageKey(MENU_CACHE_PREFIX, 'u1'))).toBeNull();
    expect(localStorage.getItem(DEVICE_PREF_KEY)).toBe('America/Lima');
  });

  it('clearLocalSession() keeps the POS draft so an expired cashier can resume the sale', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem(userStorageKey(POS_DRAFT_PREFIX, 'u1'), '{"cart":[1]}');

    service.clearLocalSession();

    expect(localStorage.getItem(userStorageKey(POS_DRAFT_PREFIX, 'u1'))).toBe('{"cart":[1]}');
  });

  it('clearLocalSession() drops in-memory search filters so the next user never sees them', () => {
    createService();
    const searchState = TestBed.inject(SearchStateService);
    searchState.save('pacientes', { formValues: { nombre: 'Juan Pérez' }, pageIndex: 0, pageSize: 10 });

    service.clearLocalSession();

    expect(searchState.restore('pacientes')).toBeNull();
  });

  it('requiresPasswordChange() follows the pwd_change claim', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(service.requiresPasswordChange()).toBeFalse();

    service.storeToken(buildJwt({ sub: 'u1', pwd_change: 'true', exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(service.requiresPasswordChange()).toBeTrue();
  });

  it('changePassword() posts both passwords with the refresh cookie', () => {
    createService();

    service.changePassword({ currentPassword: 'Actual123', newPassword: 'Nueva1234' }).subscribe();

    const req = httpMock.expectOne(`${AUTH_BASE}/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({ currentPassword: 'Actual123', newPassword: 'Nueva1234' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('forgotPassword() posts only the username, without cookies or the CSRF header', () => {
    createService();
    let completed = false;

    service.forgotPassword('ana').subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(`${AUTH_BASE}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombreUsuario: 'ana' });
    expect(req.request.withCredentials).toBeFalse();
    expect(req.request.headers.has('X-SOFIA-CSRF')).toBeFalse();
    req.flush({ message: 'generic' });
    expect(completed).toBeTrue();
  });

  it('resetPassword() posts username, token and new password without cookies', () => {
    createService();

    service.resetPassword({ nombreUsuario: 'ana', token: 'tok-123', newPassword: 'Nueva1234' }).subscribe();

    const req = httpMock.expectOne(`${AUTH_BASE}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombreUsuario: 'ana', token: 'tok-123', newPassword: 'Nueva1234' });
    expect(req.request.withCredentials).toBeFalse();
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
