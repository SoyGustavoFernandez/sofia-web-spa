import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { PrecioProveedorDialogComponent, costoNeto } from './precio-proveedor-dialog.component';

const API = `${environment.api.baseurl}/api/v1`;

const PARACETAMOL: MedicamentoListItem = {
  id: 'med-1',
  codigoNacional: 'COD1',
  nombreComercial: 'Paracetamol 500mg',
  laboratorioId: 'lab-1',
  laboratorioNombre: 'Lab',
  unidadBaseId: 'um-1',
  unidadBaseNombre: 'Tableta',
  condicionVenta: 0,
  precioVentaBase: 2.5,
  stockTotal: null,
};

function setup() {
  const dialogRef = jasmine.createSpyObj<MatDialogRef<PrecioProveedorDialogComponent>>('MatDialogRef', ['close']);
  const notifier = jasmine.createSpyObj<ErrorNotifierService>('ErrorNotifierService', ['showError', 'showSuccess']);
  TestBed.configureTestingModule({
    imports: [PrecioProveedorDialogComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: { proveedorId: 'prov-1' } },
      { provide: ErrorNotifierService, useValue: notifier },
    ],
  });
  const fixture = TestBed.createComponent(PrecioProveedorDialogComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController), dialogRef, notifier };
}

describe('costoNeto', () => {
  it('applies the discount and rounds to the 4 decimals the backend stores', () => {
    expect(costoNeto(10, 15)).toBe(8.5);
    expect(costoNeto(10, 0)).toBe(10);
    expect(costoNeto(10, 100)).toBe(0);
    expect(costoNeto(3.3333, 33.33)).toBe(2.2223);
  });
});

describe('PrecioProveedorDialogComponent', () => {
  it('rejects a price that is not positive and a discount outside 0-100', () => {
    const { component } = setup();
    const { precioCompra, descuentoPorcentaje } = component.form.controls;

    precioCompra.setValue(0);
    expect(precioCompra.hasError('min')).toBeTrue();
    precioCompra.setValue(-5);
    expect(precioCompra.hasError('min')).toBeTrue();
    precioCompra.setValue(10);
    expect(precioCompra.valid).toBeTrue();

    expect(descuentoPorcentaje.value).toBe(0);
    descuentoPorcentaje.setValue(-1);
    expect(descuentoPorcentaje.hasError('min')).toBeTrue();
    descuentoPorcentaje.setValue(101);
    expect(descuentoPorcentaje.hasError('max')).toBeTrue();
    descuentoPorcentaje.setValue(100);
    expect(descuentoPorcentaje.valid).toBeTrue();
  });

  it('requires a product picked from the list, not just typed text', () => {
    const { component } = setup();
    const producto = component.form.controls.producto;

    expect(producto.hasError('productoSeleccion')).toBeTrue();
    producto.setValue('Parac');
    expect(producto.hasError('productoSeleccion')).toBeTrue();
    producto.setValue(PARACETAMOL);
    expect(producto.valid).toBeTrue();
  });

  it('does not post and marks every field as touched while the form is invalid', () => {
    const { component, httpMock, dialogRef } = setup();

    component.save();

    expect(component.form.controls.producto.touched).toBeTrue();
    expect(component.form.controls.precioCompra.touched).toBeTrue();
    httpMock.expectNone(`${API}/proveedores/precios`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('shows the resulting net cost as the user types the price and the discount', () => {
    const { fixture, component } = setup();

    expect(component.costoNeto()).toBeNull();

    component.form.controls.precioCompra.setValue(10);
    component.form.controls.descuentoPorcentaje.setValue(15);
    fixture.detectChanges();

    expect(component.costoNeto()).toBe(8.5);
    expect((fixture.nativeElement as HTMLElement).querySelector('#costo-neto')?.textContent).toContain('8.50');

    component.form.controls.precioCompra.setValue(0);
    fixture.detectChanges();
    expect(component.costoNeto()).toBeNull();
  });

  it('posts the supplier, product, price and discount, then notifies and closes with true', () => {
    const { component, httpMock, dialogRef, notifier } = setup();
    component.form.setValue({ producto: PARACETAMOL, precioCompra: 10, descuentoPorcentaje: 15 });

    component.save();

    const req = httpMock.expectOne(`${API}/proveedores/precios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ proveedorId: 'prov-1', medicamentoId: 'med-1', precioCompra: 10, descuentoPorcentaje: 15 });
    req.flush('precio-1');
    expect(notifier.showSuccess).toHaveBeenCalledWith('proveedores.precios.dialog.success');
    expect(dialogRef.close).toHaveBeenCalledOnceWith(true);
  });

  it('shows the translated message of a backend error and keeps the dialog open', () => {
    const { component, httpMock, dialogRef, notifier } = setup();
    component.form.setValue({ producto: PARACETAMOL, precioCompra: 10, descuentoPorcentaje: 0 });

    component.save();
    httpMock.expectOne(`${API}/proveedores/precios`).flush({ code: 'Medicamento.NotFound' }, { status: 404, statusText: 'Not Found' });

    expect(notifier.showError).toHaveBeenCalledWith('proveedores.precios.dialog.errors.medicamento-not-found');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
  });

  it('falls back to the generic message when the backend error has no specific mapping', () => {
    const { component, httpMock, notifier } = setup();
    component.form.setValue({ producto: PARACETAMOL, precioCompra: 10, descuentoPorcentaje: 0 });

    component.save();
    httpMock.expectOne(`${API}/proveedores/precios`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(notifier.showError).toHaveBeenCalledWith('proveedores.precios.dialog.save-error');
  });

  it('searches the existing medicamentos service while typing and lists the matches', fakeAsync(() => {
    const { component, httpMock } = setup();

    component.form.controls.producto.setValue('para');
    tick(300);

    const req = httpMock.expectOne(r => r.url === `${API}/medicamentos`);
    expect(req.request.params.get('nombreComercial')).toBe('para');
    req.flush({ items: [PARACETAMOL], pageNumber: 1, totalPages: 1, totalCount: 1 });
    expect(component.productoOptions()).toEqual([PARACETAMOL]);
  }));

  it('leaves the options empty without breaking when the user cannot read medicamentos', fakeAsync(() => {
    const { component, httpMock } = setup();

    component.form.controls.producto.setValue('para');
    tick(300);
    httpMock.expectOne(r => r.url === `${API}/medicamentos`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(component.productoOptions()).toEqual([]);

    component.form.controls.producto.setValue('parace');
    tick(300);
    httpMock.expectOne(r => r.url === `${API}/medicamentos`).flush({ items: [PARACETAMOL], pageNumber: 1, totalPages: 1, totalCount: 1 });
    expect(component.productoOptions()).toEqual([PARACETAMOL]);
  }));
});
