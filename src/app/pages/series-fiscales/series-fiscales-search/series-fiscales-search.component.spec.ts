import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { SeriesFiscalesSearchComponent } from './series-fiscales-search.component';
import { TipoComprobante } from '../models/serie-fiscal.model';

const BASE = `${environment.api.baseurl}/api/v1/seriesfiscales`;
const SUCURSALES = `${environment.api.baseurl}/api/v1/sucursales`;

describe('SeriesFiscalesSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeriesFiscalesSearchComponent],
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

  function create() {
    const fixture = TestBed.createComponent(SeriesFiscalesSearchComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === SUCURSALES).flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 });
    return fixture.componentInstance;
  }

  it('starts with hidden results', () => {
    const component = create();

    expect(component.showResults()).toBeFalse();
  });

  it('search() sends the selected filters (prefix uppercased) and shows the results', () => {
    const component = create();
    component.searchForm.patchValue({ tipoComprobante: TipoComprobante.Boleta, estadoSerie: 'Activa', prefijoSerie: 'b0' });

    component.search();
    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('tipoComprobante')).toBe('2');
    expect(req.request.params.get('estadoSerie')).toBe('Activa');
    expect(req.request.params.get('prefijoSerie')).toBe('B0');
    req.flush({ items: [{ id: 'serie-1' }], pageNumber: 1, totalPages: 1, totalCount: 1 });

    expect(component.showResults()).toBeTrue();
    expect(component.totalCount()).toBe(1);
  });

  it('clear() resets the filters and hides the results', () => {
    const component = create();
    component.search();
    httpMock.expectOne(r => r.url === BASE).flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 });

    component.clear();

    expect(component.showResults()).toBeFalse();
    expect(component.searchForm.value.tipoComprobante).toBeNull();
  });
});
