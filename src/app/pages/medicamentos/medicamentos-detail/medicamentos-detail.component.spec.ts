import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { MedicamentosDetailComponent } from './medicamentos-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/medicamentos`;

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [MedicamentosDetailComponent],
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
    fixture: TestBed.createComponent(MedicamentosDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('MedicamentosDetailComponent — /nueva (create mode)', () => {
  it('opens in edit mode and still loads the condiciones-venta catalog', () => {
    const { fixture, httpMock } = setup({});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/condiciones-venta`).flush(['Venta libre']);

    expect(component.isNew()).toBeTrue();
    expect(component.isEditMode()).toBeTrue();
    expect(component.form.enabled).toBeTrue();
    httpMock.verify();
  });
});

describe('MedicamentosDetailComponent — /:id (view mode)', () => {
  it('loads the medicamento and its lab/unidad refs, disables the form', () => {
    const { fixture, httpMock } = setup({ id: 'med-1' });
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/condiciones-venta`).flush(['Venta libre']);
    httpMock.expectOne(`${BASE}/med-1`).flush({
      id: 'med-1',
      codigoNacional: 'CN-1',
      nombreComercial: 'Ibuprofeno',
      laboratorioId: 'lab-1',
      laboratorioNombre: 'Lab X',
      unidadBaseId: 'uom-1',
      unidadBaseNombre: 'Caja',
      condicionVenta: 0,
      precioVentaBase: 12.5,
      stockTotal: 10,
      stockPorSucursal: null,
    });

    const component = fixture.componentInstance;
    expect(component.isEditMode()).toBeFalse();
    expect(component.form.disabled).toBeTrue();
    expect(component.form.value.nombreComercial).toBe('Ibuprofeno');
    expect(component.selectedLab()?.nombreCompania).toBe('Lab X');
    httpMock.verify();
  });
});
