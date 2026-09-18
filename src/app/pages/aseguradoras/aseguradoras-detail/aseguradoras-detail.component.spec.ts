import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { AseguradorasDetailComponent } from './aseguradoras-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/seguros`;

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [AseguradorasDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: activatedRouteStub(routeParams) },
    ],
  });
  return {
    fixture: TestBed.createComponent(AseguradorasDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AseguradorasDetailComponent — /nueva (create mode)', () => {
  it('opens directly in edit mode with an empty, enabled form and no HTTP call', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isNew()).toBeTrue();
    expect(component.isEditMode()).toBeTrue();
    expect(component.form.enabled).toBeTrue();
    httpMock.expectNone(r => r.url === BASE);
  });

  it('save() does not call the API while required fields are empty', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

    expect(component.form.touched).toBeTrue();
    httpMock.expectNone(BASE);
  });
});

describe('AseguradorasDetailComponent — /:id (view mode)', () => {
  it('loads the aseguradora and disables the form', () => {
    const { fixture, httpMock } = setup({ id: 'aseg-1' });
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/aseg-1`).flush({
      id: 'aseg-1',
      nombreComercial: 'Rimac',
      codigoIdentificadorNacional: 'RIM-1',
    });

    const component = fixture.componentInstance;
    expect(component.isEditMode()).toBeFalse();
    expect(component.form.disabled).toBeTrue();
    expect(component.form.value.nombreComercial).toBe('Rimac');
    httpMock.verify();
  });
});
