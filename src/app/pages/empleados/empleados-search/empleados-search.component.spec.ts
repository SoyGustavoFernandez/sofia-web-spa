import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { Empleado, PaginatedList } from '../models/empleado.model';
import { EmpleadosSearchComponent } from './empleados-search.component';

const BASE = `${environment.api.baseurl}/api/v1/empleados`;

const SIN_MATERNO: Empleado = {
  id: 'emp-1',
  sucursal_Base_ID: 'suc-1',
  nombres: 'Ana',
  apellido_Paterno: 'Quispe',
  apellido_Materno: null,
  nombre_Completo: 'Ana Quispe',
  licencia_Prof: null,
  email: null,
  sucursalNombre: 'Miraflores',
};

describe('EmpleadosSearchComponent — optional second surname', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadosSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations(), provideTranslocoTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the name without a gap and an empty second-surname cell when the employee has none', () => {
    const fixture = TestBed.createComponent(EmpleadosSearchComponent);
    fixture.detectChanges();

    fixture.componentInstance.search();
    httpMock.expectOne(r => r.url === BASE).flush({ items: [SIN_MATERNO], pageNumber: 1, totalPages: 1, totalCount: 1 } as PaginatedList<Empleado>);
    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('td.mat-mdc-cell')).map(c => (c.nativeElement as HTMLElement).textContent?.trim());
    expect(cells.slice(0, 3)).toEqual(['Ana Quispe', 'Quispe', '']);
  });

  it('sends the second-surname filter only when it has a value', () => {
    const fixture = TestBed.createComponent(EmpleadosSearchComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.search();
    const sinFiltro = httpMock.expectOne(r => r.url === BASE);
    expect(sinFiltro.request.params.has('apellidoMaterno')).toBeFalse();
    sinFiltro.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<Empleado>);

    component.searchForm.controls.apellidoMaterno.setValue('Rojas');
    component.search();
    const conFiltro = httpMock.expectOne(r => r.url === BASE);
    expect(conFiltro.request.params.get('apellidoMaterno')).toBe('Rojas');
    conFiltro.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<Empleado>);
  });
});
