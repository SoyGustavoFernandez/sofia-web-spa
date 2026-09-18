import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { LotesSearchComponent } from './lotes-search.component';

describe('LotesSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotesSearchComponent],
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

  it('creates and renders with an empty, hidden results state', () => {
    const fixture = TestBed.createComponent(LotesSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.showResults()).toBeFalse();
    expect(component.items()).toEqual([]);
  });

  it('search() populates the results table and shows it', () => {
    const fixture = TestBed.createComponent(LotesSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search();
    const req = httpMock.expectOne(r => r.url === `${environment.api.baseurl}/api/v1/lotesinventario`);
    req.flush({
      items: [
        {
          id: 'lote-1',
          productoId: 'prod-1',
          nombreProducto: 'Ibuprofeno',
          numeroLoteMfr: 'L-1',
          fechaFabricacion: null,
          fechaCaducidad: '2027-01-01',
        },
      ],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
    });

    expect(component.showResults()).toBeTrue();
    expect(component.items().length).toBe(1);
    expect(component.totalCount()).toBe(1);
  });

  it('clear() resets the form and hides the results again', () => {
    const fixture = TestBed.createComponent(LotesSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search();
    httpMock
      .expectOne(r => r.url === `${environment.api.baseurl}/api/v1/lotesinventario`)
      .flush({ items: [{ id: 'l1' }], pageNumber: 1, totalPages: 1, totalCount: 1 });

    component.clear();

    expect(component.showResults()).toBeFalse();
    expect(component.items()).toEqual([]);
    expect(component.searchForm.value.productoNombre).toBeNull();
  });
});
