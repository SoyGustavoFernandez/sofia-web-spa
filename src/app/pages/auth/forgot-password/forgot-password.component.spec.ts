import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ForgotPasswordComponent } from './forgot-password.component';

const URL = `${environment.api.baseurl}/api/v1/auth/forgot-password`;

function setup() {
  TestBed.configureTestingModule({
    imports: [ForgotPasswordComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), provideTranslocoTesting()],
  });
  const fixture = TestBed.createComponent(ForgotPasswordComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController) };
}

describe('ForgotPasswordComponent', () => {
  it('does not call the API without a username', () => {
    const { component, httpMock } = setup();

    component.submit();

    expect(component.form.touched).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('sends the trimmed username and shows the generic confirmation', () => {
    const { fixture, component, httpMock } = setup();
    component.form.setValue({ usuario: '  ana  ' });

    component.submit();
    const req = httpMock.expectOne(URL);
    expect(req.request.body).toEqual({ nombreUsuario: 'ana' });
    req.flush({ message: 'If the account exists, a recovery link will be sent to the registered contact.' });
    fixture.detectChanges();

    expect(component.sent()).toBeTrue();
    expect(component.error()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('shows a rate-limit message on 429 and keeps the form', () => {
    const { component, httpMock } = setup();
    component.form.setValue({ usuario: 'ana' });

    component.submit();
    httpMock.expectOne(URL).flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(component.sent()).toBeFalse();
    expect(component.submitting()).toBeFalse();
    expect(component.error()).toBe('auth.recovery.tooManyRequests');
  });

  it('shows a generic error when the request fails for another reason', () => {
    const { component, httpMock } = setup();
    component.form.setValue({ usuario: 'ana' });

    component.submit();
    httpMock.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('auth.forgotPage.error');
  });
});
