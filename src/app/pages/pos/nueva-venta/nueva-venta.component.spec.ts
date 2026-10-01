import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { LoteDisponibleVenta, PresentacionProductoVenta } from '../models/venta.model';
import { VentaService } from '../services/venta.service';
import { NuevaVentaComponent } from './nueva-venta.component';

const MEDICAMENTO = { id: 'med-1', nombreComercial: 'Paracetamol', stockTotal: 8 } as MedicamentoListItem;

const LOTE: LoteDisponibleVenta = {
  id: 'inv-1',
  loteId: 'lote-1',
  numeroLote: 'L-001',
  productoId: 'med-1',
  productoNombre: 'Paracetamol',
  fechaCaducidad: '2099-01-01T00:00:00Z',
  cantidadFisica: 8,
  precioVentaBase: 2.5,
};

const PRESENTACION: PresentacionProductoVenta = { id: 'pres-1', descripcion: 'Caja x10', cantidadUnidadesBase: 10, precioVenta: 20 };

function apiError(status: number, code?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: code ? { code } : null });
}

function setup() {
  const ventaService = jasmine.createSpyObj<VentaService>('VentaService', ['lotesDisponibles', 'presentacionesProducto']);
  const medicamentoService = jasmine.createSpyObj<MedicamentoService>('MedicamentoService', ['search', 'getCondicionesVenta']);
  const notifier = jasmine.createSpyObj<ErrorNotifierService>('ErrorNotifierService', ['showError', 'showSuccess']);
  medicamentoService.getCondicionesVenta.and.returnValue(of([]));
  medicamentoService.search.and.returnValue(of({ items: [MEDICAMENTO], pageNumber: 1, totalPages: 1, totalCount: 1 }));

  TestBed.configureTestingModule({
    imports: [NuevaVentaComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: AuthService, useValue: { sucursalId: () => null, empleadoId: () => null, userId: () => 'cajero-spec' } },
      { provide: VentaService, useValue: ventaService },
      { provide: MedicamentoService, useValue: medicamentoService },
      { provide: ErrorNotifierService, useValue: notifier },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
    ],
  });
  const component = TestBed.createComponent(NuevaVentaComponent).componentInstance;
  return { component, ventaService, medicamentoService, notifier };
}

describe('NuevaVentaComponent — POS lookups', () => {
  it('loads the catalog ranked by sales with the sellable stock of the own branch', fakeAsync(() => {
    const { component, medicamentoService } = setup();

    component.ngOnInit();
    tick(300);

    expect(medicamentoService.search).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ incluirStock: true, soloStockVendibleEnMiSucursal: true, ordenarPorMasVendidos: true, pageSize: 12 }),
    );
    expect(component.medicamentoOptions()).toEqual([MEDICAMENTO]);
  }));

  it('reports a failed catalog search and keeps searching afterwards', fakeAsync(() => {
    const { component, medicamentoService, notifier } = setup();
    medicamentoService.search.and.returnValue(throwError(() => apiError(500)));

    component.ngOnInit();
    tick(300);

    expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.catalogoError');
    expect(component.medicamentoOptions()).toEqual([]);

    medicamentoService.search.and.returnValue(of({ items: [MEDICAMENTO], pageNumber: 1, totalPages: 1, totalCount: 1 }));
    component.setCondicionFiltro(1);
    tick(300);

    expect(component.medicamentoOptions()).toEqual([MEDICAMENTO]);
  }));

  it('lists the lots returned by the POS endpoint for the selected product', () => {
    const { component, ventaService, notifier } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([LOTE]));

    component.selectMedicamento(MEDICAMENTO);

    expect(ventaService.lotesDisponibles).toHaveBeenCalledOnceWith({ productoId: 'med-1' });
    expect(component.loteOptions()).toEqual([LOTE]);
    expect(notifier.showError).not.toHaveBeenCalled();
  });

  it('clears the lots and shows the error when the lot lookup fails', () => {
    const { component, ventaService, notifier } = setup();
    component.loteOptions.set([LOTE]);
    ventaService.lotesDisponibles.and.returnValue(throwError(() => apiError(403)));

    component.selectMedicamento(MEDICAMENTO);

    expect(component.loteOptions()).toEqual([]);
    expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.lotesError');
  });

  it('shows the specific message when the backend reports a known code', () => {
    const { component, ventaService, notifier } = setup();
    ventaService.lotesDisponibles.and.returnValue(throwError(() => apiError(401, 'Auth.Sucursal')));

    component.selectMedicamento(MEDICAMENTO);

    expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.contextError');
  });

  it('loads the presentations of the lot product through the POS endpoint', () => {
    const { component, ventaService } = setup();
    ventaService.presentacionesProducto.and.returnValue(of([PRESENTACION]));

    component.selectLote(LOTE);

    expect(ventaService.presentacionesProducto).toHaveBeenCalledOnceWith('med-1');
    expect(component.presentacionOptions()).toEqual([PRESENTACION]);
  });

  it('clears the presentations and shows the error when their lookup fails', () => {
    const { component, ventaService, notifier } = setup();
    component.presentacionOptions.set([PRESENTACION]);
    ventaService.presentacionesProducto.and.returnValue(throwError(() => apiError(500)));

    component.selectLote(LOTE);

    expect(component.presentacionOptions()).toEqual([]);
    expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.presentacionesError');
  });
});
