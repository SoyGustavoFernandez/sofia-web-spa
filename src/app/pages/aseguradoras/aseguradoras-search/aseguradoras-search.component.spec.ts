import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AseguradorasSearchComponent } from './aseguradoras-search.component';

const BASE = `${environment.api.baseurl}/api/v1/seguros`;

describe('AseguradorasSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AseguradorasSearchComponent],
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

  it('creates with results hidden and no HTTP call until search() runs', () => {
    const fixture = TestBed.createComponent(AseguradorasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.showResults()).toBeFalse();
    httpMock.expectNone(r => r.url === BASE);
  });

  it('search() populates and shows the results table', () => {
    const fixture = TestBed.createComponent(AseguradorasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search();
    const req = httpMock.expectOne(r => r.url === BASE);
    req.flush({
      items: [{ id: 'aseg-1', nombreComercial: 'Rimac', codigoIdentificadorNacional: 'RIM-1' }],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
    });

    expect(component.showResults()).toBeTrue();
    expect(component.items().length).toBe(1);
  });

  it('clear() hides the results and resets the filters', () => {
    const fixture = TestBed.createComponent(AseguradorasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search();
    httpMock.expectOne(r => r.url === BASE).flush({ items: [{ id: 'a1' }], pageNumber: 1, totalPages: 1, totalCount: 1 });

    component.clear();

    expect(component.showResults()).toBeFalse();
    expect(component.items()).toEqual([]);
  });
});
