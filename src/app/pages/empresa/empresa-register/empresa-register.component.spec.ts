import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { EmpresaRegisterComponent } from './empresa-register.component';

const URL = `${environment.api.baseurl}/api/v1/empresas/registrar`;

const VALID = {
  nombreEmpresa: ' Botica Central ',
  ruc: '20123456789',
  adminNombres: ' Ana Maria ',
  adminApellidoPaterno: ' Quispe ',
  adminApellidoMaterno: '  ',
  adminEmail: 'ana@botica.pe',
  usuario: 'anaq',
  password: 'Segura123',
};

function setup() {
  TestBed.configureTestingModule({
    imports: [EmpresaRegisterComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), provideTranslocoTesting()],
  });
  const notifier = TestBed.inject(ErrorNotifierService);
  spyOn(notifier, 'showError');
  spyOn(notifier, 'showSuccess');
  const fixture = TestBed.createComponent(EmpresaRegisterComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController), notifier };
}

describe('EmpresaRegisterComponent', () => {
  it('requires ruc, admin names and email but not the maternal surname', () => {
    const { component, httpMock } = setup();

    component.submit();

    const c = component.form.controls;
    expect(c.ruc.hasError('required')).toBeTrue();
    expect(c.adminNombres.hasError('required')).toBeTrue();
    expect(c.adminApellidoPaterno.hasError('required')).toBeTrue();
    expect(c.adminEmail.hasError('required')).toBeTrue();
    expect(c.adminApellidoMaterno.valid).toBeTrue();
    httpMock.expectNone(URL);
  });

  it('rejects an invalid email and a ruc that is not 11 digits', () => {
    const { component } = setup();
    component.form.patchValue({ adminEmail: 'no-es-correo', ruc: '123' });

    expect(component.form.controls.adminEmail.hasError('email')).toBeTrue();
    expect(component.form.controls.ruc.hasError('pattern')).toBeTrue();
  });

  it('sends the trimmed admin data with a null maternal surname when left blank', () => {
    const { component, httpMock } = setup();
    component.form.setValue(VALID);

    component.submit();

    const req = httpMock.expectOne(URL);
    expect(req.request.body).toEqual({
      nombreEmpresa: 'Botica Central',
      ruc: '20123456789',
      adminNombres: 'Ana Maria',
      adminApellidoPaterno: 'Quispe',
      adminApellidoMaterno: null,
      adminEmail: 'ana@botica.pe',
      usuario: 'anaq',
      password: 'Segura123',
    });
  });

  it('shows a specific message when the ruc is already registered', () => {
    const { component, httpMock, notifier } = setup();
    component.form.setValue(VALID);

    component.submit();
    httpMock.expectOne(URL).flush({ code: 'Empresa.RUC.Duplicado' }, { status: 409, statusText: 'Conflict' });

    expect(component.submitting()).toBeFalse();
    expect(notifier.showError).toHaveBeenCalledWith('empresa.notifications.rucDuplicado');
  });

  it('shows the generic error for unknown failures', () => {
    const { component, httpMock, notifier } = setup();
    component.form.setValue(VALID);

    component.submit();
    httpMock.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(notifier.showError).toHaveBeenCalledWith('empresa.notifications.registerError');
  });
});
