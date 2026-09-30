import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from '@environment/environment';
import { authInterceptor, isApiRequest } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

const API = environment.api.baseurl;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'token' | 'refreshAccessToken' | 'logout' | 'clearLocalSession'>>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['token', 'refreshAccessToken', 'logout', 'clearLocalSession']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('attaches a Bearer token to outgoing requests when one is present', () => {
    authServiceSpy.token.and.returnValue('abc123');

    http.get(`${API}/api/v1/lotes`).subscribe();

    const req = httpMock.expectOne(`${API}/api/v1/lotes`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('does not set an Authorization header when there is no token', () => {
    authServiceSpy.token.and.returnValue(null);

    http.get(`${API}/api/v1/lotes`).subscribe();

    const req = httpMock.expectOne(`${API}/api/v1/lotes`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('on a 401 from a regular endpoint, refreshes the token and retries the original request', () => {
    authServiceSpy.token.and.returnValue('expired-token');
    authServiceSpy.refreshAccessToken.and.returnValue(of('fresh-token'));

    let result: unknown;
    http.get(`${API}/api/v1/lotes`).subscribe(res => (result = res));

    httpMock.expectOne(`${API}/api/v1/lotes`).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshAccessToken).toHaveBeenCalled();
    const retried = httpMock.expectOne(`${API}/api/v1/lotes`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('logs out and propagates the error when the refresh itself fails after a 401', () => {
    authServiceSpy.token.and.returnValue('expired-token');
    authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('refresh failed')));

    let error: unknown;
    http.get(`${API}/api/v1/lotes`).subscribe({ error: e => (error = e) });

    httpMock.expectOne(`${API}/api/v1/lotes`).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(error).toBeTruthy();
  });

  it('propagates non-401 errors without touching the session', () => {
    authServiceSpy.token.and.returnValue('a-token');

    let error: unknown;
    http.get(`${API}/api/v1/lotes`).subscribe({ error: e => (error = e) });

    httpMock.expectOne(`${API}/api/v1/lotes`).flush('server error', { status: 500, statusText: 'Internal Server Error' });

    expect(error).toBeTruthy();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('on a 403 requiring a password change, routes to the change password page and propagates the error', () => {
    authServiceSpy.token.and.returnValue('a-token');
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    let error: unknown;
    http.get(`${API}/api/v1/lotes`).subscribe({ error: e => (error = e) });

    httpMock.expectOne(`${API}/api/v1/lotes`).flush({ code: 'Auth.CambioClaveRequerido' }, { status: 403, statusText: 'Forbidden' });

    expect(navigateSpy).toHaveBeenCalledWith(['/cambiar-clave']);
    expect(error).toBeTruthy();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('does not reroute other 403 responses', () => {
    authServiceSpy.token.and.returnValue('a-token');
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

    http.get(`${API}/api/v1/lotes`).subscribe({ error: () => undefined });

    httpMock.expectOne(`${API}/api/v1/lotes`).flush({ code: 'Cuenta.AdminProtegida' }, { status: 403, statusText: 'Forbidden' });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('on a 401 from /auth/login, propagates the error without clearing the session', () => {
    authServiceSpy.token.and.returnValue(null);

    let error: unknown;
    http.post(`${API}/api/v1/auth/login`, {}).subscribe({ error: e => (error = e) });

    httpMock.expectOne(`${API}/api/v1/auth/login`).flush('invalid credentials', { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(authServiceSpy.clearLocalSession).not.toHaveBeenCalled();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('on a 401 from /auth/refresh, clears the local session silently without retrying', () => {
    authServiceSpy.token.and.returnValue('expired-token');

    let error: unknown;
    http.post(`${API}/api/v1/auth/refresh`, {}).subscribe({ error: e => (error = e) });

    httpMock.expectOne(`${API}/api/v1/auth/refresh`).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.clearLocalSession).toHaveBeenCalled();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
    expect(error).toBeTruthy();
  });

  it('never sends the token to static assets such as translations', () => {
    authServiceSpy.token.and.returnValue('abc123');

    http.get('/i18n/es.json').subscribe();

    const req = httpMock.expectOne('/i18n/es.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('never sends the token to other hosts', () => {
    authServiceSpy.token.and.returnValue('abc123');

    http.get('https://api.iconify.design/solar.json').subscribe();

    const req = httpMock.expectOne('https://api.iconify.design/solar.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not try to refresh the session on a 401 from a non-API request', () => {
    authServiceSpy.token.and.returnValue('abc123');

    http.get('/i18n/es.json').subscribe({ error: () => undefined });

    httpMock.expectOne('/i18n/es.json').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});

describe('isApiRequest', () => {
  it('matches same-origin API paths when the base url is empty', () => {
    expect(isApiRequest('/api/v1/lotes', '')).toBeTrue();
    expect(isApiRequest('/i18n/es.json', '')).toBeFalse();
    expect(isApiRequest('//evil.example/api/v1/lotes', '')).toBeFalse();
    expect(isApiRequest('https://evil.example/api/v1/lotes', '')).toBeFalse();
  });

  it('matches only the configured origin when the base url is absolute', () => {
    expect(isApiRequest('https://api.sofia.pe/api/v1/lotes', 'https://api.sofia.pe')).toBeTrue();
    expect(isApiRequest('https://api.sofia.pe/api/v1/lotes', 'https://api.sofia.pe/')).toBeTrue();
    expect(isApiRequest('https://api.sofia.pe.evil.example/api/v1/lotes', 'https://api.sofia.pe')).toBeFalse();
    expect(isApiRequest('/api/v1/lotes', 'https://api.sofia.pe')).toBeFalse();
    expect(isApiRequest('https://api.sofia.pe/i18n/es.json', 'https://api.sofia.pe')).toBeFalse();
  });
});
