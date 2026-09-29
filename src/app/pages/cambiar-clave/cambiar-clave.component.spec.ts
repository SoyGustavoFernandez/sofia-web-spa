import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { CambiarClaveComponent } from './cambiar-clave.component';

const URL = `${environment.api.baseurl}/api/v1/auth/change-password`;

function setup() {
  TestBed.configureTestingModule({
    imports: [CambiarClaveComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
    ],
  });
  const fixture = TestBed.createComponent(CambiarClaveComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController) };
}

describe('CambiarClaveComponent', () => {
  it('does not call the API while the form is invalid', () => {
    const { component, httpMock } = setup();

    component.save();

    expect(component.form.touched).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('rejects a new password shorter than the minimum', () => {
    const { component } = setup();
    component.form.setValue({ currentPassword: 'Actual123', newPassword: 'corta', confirmPassword: 'corta' });

    expect(component.form.controls.newPassword.hasError('minlength')).toBeTrue();
  });

  it('rejects a new password equal to the current one and a mismatched confirmation', () => {
    const { component, httpMock } = setup();
    component.form.setValue({ currentPassword: 'Actual123', newPassword: 'Actual123', confirmPassword: 'Otra12345' });

    component.save();

    expect(component.form.hasError('sameAsCurrent')).toBeTrue();
    expect(component.form.hasError('mismatch')).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('sends the change, drops the local session and goes to login on success', () => {
    const { component, httpMock } = setup();
    const auth = TestBed.inject(AuthService);
    const clearSpy = spyOn(auth, 'clearLocalSession');
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.form.setValue({ currentPassword: 'Actual123', newPassword: 'Nueva1234', confirmPassword: 'Nueva1234' });

    component.save();

    const req = httpMock.expectOne(URL);
    expect(req.request.body).toEqual({ currentPassword: 'Actual123', newPassword: 'Nueva1234' });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('keeps the user on the page when the current password is wrong', () => {
    const { component, httpMock } = setup();
    const clearSpy = spyOn(TestBed.inject(AuthService), 'clearLocalSession');
    component.form.setValue({ currentPassword: 'Mala12345', newPassword: 'Nueva1234', confirmPassword: 'Nueva1234' });

    component.save();
    httpMock.expectOne(URL).flush({ code: 'Auth.ClaveActualIncorrecta' }, { status: 400, statusText: 'Bad Request' });

    expect(component.saving()).toBeFalse();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
