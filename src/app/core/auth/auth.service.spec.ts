import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '@environment/environment';
import { AuthService } from './auth.service';

const AUTH_BASE = `${environment.api.baseurl}/api/v1/auth`;
const TOKEN_KEY = 'sofia_token';

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

  it('hasRole()/hasAnyRole() reflect the roles claim', () => {
    createService();
    const token = buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, roles: ['Admin', 'Farmaceutico'] });
    service.storeToken(token);

    expect(service.hasRole('Admin')).toBeTrue();
    expect(service.hasRole('Cajero')).toBeFalse();
    expect(service.hasAnyRole('Cajero', 'Farmaceutico')).toBeTrue();
    expect(service.hasAnyRole('Cajero', 'Supervisor')).toBeFalse();
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

  it('clearLocalSession() removes the token without calling the server or navigating', () => {
    createService();
    service.storeToken(buildJwt({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    service.clearLocalSession();

    expect(service.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
