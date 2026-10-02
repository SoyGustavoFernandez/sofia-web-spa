import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { Empleado } from '../models/empleado.model';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { EmpleadosDetailComponent } from './empleados-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/empleados`;

const SUCURSAL: SucursalListItem = { id: 'suc-1', nombre: 'Miraflores', direccionFisica: 'Av. Larco 123', numeroLicencia: 'L-1', gerenteNombre: null };

function empleado(overrides: Partial<Empleado> = {}): Empleado {
  return {
    id: 'emp-1',
    sucursal_Base_ID: 'suc-1',
    nombres: 'Ana',
    apellido_Paterno: 'Quispe',
    apellido_Materno: null,
    nombre_Completo: 'Ana Quispe',
    licencia_Prof: null,
    email: null,
    sucursalNombre: 'Miraflores',
    ...overrides,
  };
}

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [EmpleadosDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: activatedRouteStub(routeParams) },
    ],
  });
  const fixture = TestBed.createComponent(EmpleadosDetailComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController) };
}

function apellidoMaternoInput(fixture: ReturnType<typeof setup>['fixture']): HTMLInputElement {
  return fixture.debugElement.query(By.css('input[formControlName="apellidoMaterno"]')).nativeElement as HTMLInputElement;
}

describe('EmpleadosDetailComponent — optional second surname', () => {
  it('requires names and first surname but not the second surname', () => {
    const { component, httpMock } = setup({});

    component.save();

    const c = component.form.controls;
    expect(c.nombres.hasError('required')).toBeTrue();
    expect(c.apellidoPaterno.hasError('required')).toBeTrue();
    expect(c.apellidoMaterno.valid).toBeTrue();
    httpMock.expectNone(BASE);
  });

  it('creates the employee with a null second surname when it is left blank', () => {
    const { component, httpMock } = setup({});
    component.form.patchValue({ nombres: 'Ana', apellidoPaterno: 'Quispe', apellidoMaterno: '   ' });
    component.selectSucursal(SUCURSAL);

    component.save();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({ apellido_Materno: null }));
    req.flush('emp-1');
  });

  it('sends the second surname trimmed when it is provided', () => {
    const { component, httpMock } = setup({});
    component.form.patchValue({ nombres: 'Ana', apellidoPaterno: 'Quispe', apellidoMaterno: ' Rojas ' });
    component.selectSucursal(SUCURSAL);

    component.save();

    const req = httpMock.expectOne(BASE);
    expect(req.request.body).toEqual(jasmine.objectContaining({ apellido_Materno: 'Rojas' }));
    req.flush('emp-1');
  });

  it('shows an empty second surname in view mode when the employee has none', () => {
    const { fixture, httpMock } = setup({ id: 'emp-1' });
    httpMock.expectOne(`${BASE}/emp-1`).flush(empleado());
    fixture.detectChanges();

    expect(apellidoMaternoInput(fixture).value).toBe('');
  });

  it('clears the second surname of an existing employee by sending null', () => {
    const { fixture, component, httpMock } = setup({ id: 'emp-1' });
    httpMock.expectOne(`${BASE}/emp-1`).flush(empleado({ apellido_Materno: 'Rojas', nombre_Completo: 'Ana Quispe Rojas' }));
    fixture.detectChanges();
    component.enterEditMode();
    component.form.controls.apellidoMaterno.setValue('');

    component.save();

    const req = httpMock.expectOne(`${BASE}/emp-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(jasmine.objectContaining({ apellido_Materno: null }));
    req.flush(null);
  });
});
