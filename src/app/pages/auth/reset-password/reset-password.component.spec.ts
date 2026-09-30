import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { RESET_PASSWORD_PATH, ResetPasswordComponent } from './reset-password.component';

const URL = `${environment.api.baseurl}/api/v1/auth/reset-password`;

function setup(fragment: string | null) {
  TestBed.configureTestingModule({
    imports: [ResetPasswordComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLocationMocks(),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
    ],
  });
  const replaceSpy = spyOn(TestBed.inject(Location), 'replaceState');
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController), replaceSpy };
}

describe('ResetPasswordComponent', () => {
  it('reads token and username from the fragment and removes them from the address bar', () => {
    const { component, replaceSpy } = setup('token=abc-123_XYZ&usuario=ana%20p%C3%A9rez');

    expect(component.linkValid()).toBeTrue();
    expect(replaceSpy).toHaveBeenCalledWith(RESET_PASSWORD_PATH);
  });

  it('treats a link without token or username as invalid and hides the form', () => {
    const { fixture, component, replaceSpy } = setup('usuario=ana');

    expect(component.linkValid()).toBeFalse();
    expect(replaceSpy).toHaveBeenCalledWith(RESET_PASSWORD_PATH);
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('applies the change-password rules: minimum length and matching confirmation', () => {
    const { component, httpMock } = setup('token=abc&usuario=ana');
    component.form.setValue({ newPassword: 'corta', confirmPassword: 'otra' });

    component.submit();

    expect(component.form.controls.newPassword.hasError('minlength')).toBeTrue();
    expect(component.form.hasError('mismatch')).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('sends username, token and new password, drops any local session and goes to login', () => {
    const { component, httpMock } = setup('token=abc-123_XYZ&usuario=ana%20p%C3%A9rez');
    const clearSpy = spyOn(TestBed.inject(AuthService), 'clearLocalSession');
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.form.setValue({ newPassword: 'Nueva1234', confirmPassword: 'Nueva1234' });

    component.submit();
    const req = httpMock.expectOne(URL);
    expect(req.request.body).toEqual({ nombreUsuario: 'ana pérez', token: 'abc-123_XYZ', newPassword: 'Nueva1234' });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('shows the expired-link message when the API rejects the token', () => {
    const { component, httpMock } = setup('token=abc&usuario=ana');
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
    component.form.setValue({ newPassword: 'Nueva1234', confirmPassword: 'Nueva1234' });

    component.submit();
    httpMock.expectOne(URL).flush({ code: 'Auth.InvalidToken' }, { status: 400, statusText: 'Bad Request' });

    expect(component.error()).toBe('auth.resetPage.invalidToken');
    expect(component.submitting()).toBeFalse();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
