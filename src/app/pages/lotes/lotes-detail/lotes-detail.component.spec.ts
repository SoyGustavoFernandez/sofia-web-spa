import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { LotesDetailComponent } from './lotes-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/lotesinventario`;

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [LotesDetailComponent],
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
    fixture: TestBed.createComponent(LotesDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('LotesDetailComponent — /nueva (create mode)', () => {
  it('opens directly in edit mode with an empty, enabled form', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.isNew()).toBeTrue();
    expect(component.isEditMode()).toBeTrue();
    expect(component.form.enabled).toBeTrue();
    httpMock.verify();
  });

  it('save() is a no-op while the form is invalid and no product is selected', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

    expect(component.form.touched).toBeTrue();
    httpMock.expectNone(BASE);
  });
});

describe('LotesDetailComponent — /:id (view mode)', () => {
  it('loads the lote, disables the form, and shows read-only data', () => {
    const { fixture, httpMock } = setup({ id: 'lote-1' });
    fixture.detectChanges();

    const req = httpMock.expectOne(`${BASE}/lote-1`);
    req.flush({
      id: 'lote-1',
      productoId: 'prod-1',
      nombreProducto: 'Ibuprofeno',
      numeroLoteMfr: 'L-1',
      fechaFabricacion: null,
      fechaCaducidad: '2027-01-01',
    });

    const component = fixture.componentInstance;
    expect(component.isNew()).toBeFalse();
    expect(component.isEditMode()).toBeFalse();
    expect(component.form.disabled).toBeTrue();
    expect(component.form.value.numeroLoteMfr).toBe('L-1');
    httpMock.verify();
  });

  it('enterEditMode() enables the form so it can be saved', () => {
    const { fixture, httpMock } = setup({ id: 'lote-1' });
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/lote-1`).flush({
      id: 'lote-1',
      productoId: 'prod-1',
      nombreProducto: 'Ibuprofeno',
      numeroLoteMfr: 'L-1',
      fechaFabricacion: null,
      fechaCaducidad: '2027-01-01',
    });

    const component = fixture.componentInstance;
    component.enterEditMode();

    expect(component.isEditMode()).toBeTrue();
    expect(component.form.enabled).toBeTrue();
    httpMock.verify();
  });
});
