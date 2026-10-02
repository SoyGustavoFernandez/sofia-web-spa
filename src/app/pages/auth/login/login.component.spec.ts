import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { LoginComponent, loginErrorKey } from './login.component';

const URL = `${environment.api.baseurl}/api/v1/auth/login`;

function setup() {
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), provideTranslocoTesting()],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController) };
}

function submitLogin() {
  const ctx = setup();
  ctx.component.form.setValue({ usuario: 'ana', password: 'secreta' });
  ctx.component.submit();
  return { ...ctx, req: ctx.httpMock.expectOne(URL) };
}

describe('LoginComponent', () => {
  it('does not call the API while the form is incomplete', () => {
    const { component, httpMock } = setup();

    component.submit();

    expect(component.form.touched).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('blames the credentials when the API rejects them with 401', () => {
    const { fixture, component, req } = submitLogin();

    req.flush({ code: 'Auth.InvalidCredentials' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(component.loginError()).toBe('auth.invalidCredentials');
    expect(component.submitting()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-error')?.textContent).toContain('auth.invalidCredentials');
  });

  it('reports the service as unavailable, not the credentials, when the API cannot be reached', () => {
    const { component, req } = submitLogin();

    req.error(new ProgressEvent('error'));

    expect(component.loginError()).toBe('auth.serviceUnavailable');
    expect(component.submitting()).toBeFalse();
  });

  it('reports the service as unavailable when the API fails with a server error', () => {
    const { component, req } = submitLogin();

    req.flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.loginError()).toBe('auth.serviceUnavailable');
  });

  it('keeps the specific message of a rejection the API explains', () => {
    const { component, req } = submitLogin();

    req.flush({ code: 'Auth.EmpresaNoVigente' }, { status: 403, statusText: 'Forbidden' });

    expect(component.loginError()).toBe('auth.empresaNoVigente');
  });

  it('shows the rate-limit message on 429', () => {
    const { component, req } = submitLogin();

    req.flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(component.loginError()).toBe('auth.recovery.tooManyRequests');
  });
});

describe('loginErrorKey', () => {
  it('treats a failure that is not an HTTP response (timeout, script error) as an unavailable service', () => {
    expect(loginErrorKey(new Error('timeout'))).toBe('auth.serviceUnavailable');
  });
});
