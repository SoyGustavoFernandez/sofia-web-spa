import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { RolesSearchComponent } from './roles-search.component';

const BASE = `${environment.api.baseurl}/api/v1/roles`;

describe('RolesSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesSearchComponent],
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

  it('creates with results hidden and no HTTP call until search() is invoked', () => {
    const fixture = TestBed.createComponent(RolesSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.showResults()).toBeFalse();
    httpMock.expectNone(r => r.url === BASE);
  });

  it('search() only sends nivelJerarquia bounds when they differ from the slider defaults', () => {
    const fixture = TestBed.createComponent(RolesSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.search();
    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.has('nivelJerarquiaDesde')).toBeFalse();
    expect(req.request.params.has('nivelJerarquiaHasta')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 });

    expect(component.showResults()).toBeTrue();
  });
});
