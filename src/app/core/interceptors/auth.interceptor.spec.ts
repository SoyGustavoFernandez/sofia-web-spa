import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

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

    http.get('/api/v1/lotes').subscribe();

    const req = httpMock.expectOne('/api/v1/lotes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('does not set an Authorization header when there is no token', () => {
    authServiceSpy.token.and.returnValue(null);

    http.get('/api/v1/lotes').subscribe();

    const req = httpMock.expectOne('/api/v1/lotes');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('on a 401 from a regular endpoint, refreshes the token and retries the original request', () => {
    authServiceSpy.token.and.returnValue('expired-token');
    authServiceSpy.refreshAccessToken.and.returnValue(of('fresh-token'));

    let result: unknown;
    http.get('/api/v1/lotes').subscribe(res => (result = res));

    httpMock.expectOne('/api/v1/lotes').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.refreshAccessToken).toHaveBeenCalled();
    const retried = httpMock.expectOne('/api/v1/lotes');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('logs out and propagates the error when the refresh itself fails after a 401', () => {
    authServiceSpy.token.and.returnValue('expired-token');
    authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('refresh failed')));

    let error: unknown;
    http.get('/api/v1/lotes').subscribe({ error: e => (error = e) });

    httpMock.expectOne('/api/v1/lotes').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(error).toBeTruthy();
  });

  it('propagates non-401 errors without touching the session', () => {
    authServiceSpy.token.and.returnValue('a-token');

    let error: unknown;
    http.get('/api/v1/lotes').subscribe({ error: e => (error = e) });

    httpMock.expectOne('/api/v1/lotes').flush('server error', { status: 500, statusText: 'Internal Server Error' });

    expect(error).toBeTruthy();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('on a 401 from /auth/login, propagates the error without clearing the session', () => {
    authServiceSpy.token.and.returnValue(null);

    let error: unknown;
    http.post('/api/v1/auth/login', {}).subscribe({ error: e => (error = e) });

    httpMock.expectOne('/api/v1/auth/login').flush('invalid credentials', { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(authServiceSpy.clearLocalSession).not.toHaveBeenCalled();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('on a 401 from /auth/refresh, clears the local session silently without retrying', () => {
    authServiceSpy.token.and.returnValue('expired-token');

    let error: unknown;
    http.post('/api/v1/auth/refresh', {}).subscribe({ error: e => (error = e) });

    httpMock.expectOne('/api/v1/auth/refresh').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.clearLocalSession).toHaveBeenCalled();
    expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
    expect(error).toBeTruthy();
  });
});
