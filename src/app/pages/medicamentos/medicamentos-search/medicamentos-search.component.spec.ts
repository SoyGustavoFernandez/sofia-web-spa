import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { MedicamentosSearchComponent } from './medicamentos-search.component';

const BASE = `${environment.api.baseurl}/api/v1/medicamentos`;

describe('MedicamentosSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicamentosSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslocoTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates, loads condiciones-venta on init, and starts with results hidden', () => {
    const fixture = TestBed.createComponent(MedicamentosSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/condiciones-venta`).flush(['Venta libre', 'Receta médica']);

    expect(component).toBeTruthy();
    expect(component.showResults()).toBeFalse();
    expect(component.condicionLabels()).toEqual(['Venta libre', 'Receta médica']);
  });

  it('search() populates the results table', () => {
    const fixture = TestBed.createComponent(MedicamentosSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/condiciones-venta`).flush([]);

    component.search();
    const req = httpMock.expectOne(r => r.url === BASE);
    req.flush({
      items: [
        {
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
        },
      ],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
    });

    expect(component.showResults()).toBeTrue();
    expect(component.items().length).toBe(1);
  });
});
