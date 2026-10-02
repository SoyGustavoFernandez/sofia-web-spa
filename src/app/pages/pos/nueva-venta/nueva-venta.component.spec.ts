import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { POS_DRAFT_PREFIX, clearUserStorage, userStorageKey } from '@core/auth/user-storage';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { LoteDisponibleVenta, MetodoPago, PresentacionProductoVenta, VentaConDetalle } from '../models/venta.model';
import { VentaService } from '../services/venta.service';
import { NuevaVentaComponent } from './nueva-venta.component';
import { parsePosDraft, serializePosDraft } from './pos-draft';

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

const DRAFT_KEY = userStorageKey(POS_DRAFT_PREFIX, 'cajero-spec');
const PAGO_INICIAL = { metodoPago: MetodoPago.Efectivo, monto: 0, referencia: '' };

function apiError(status: number, code?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: code ? { code } : null });
}

function cartLine(cantidad: number, precioUnitario: number, loteId = 'lote-1') {
  return { loteId, productoNombre: 'Paracetamol', numeroLote: 'L-001', cantidadDisponible: 50, cantidad, precioUnitario };
}

function setup(continuar?: string) {
  const ventaService = jasmine.createSpyObj<VentaService>('VentaService', ['lotesDisponibles', 'presentacionesProducto', 'crear', 'getById']);
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
      { provide: AuthService, useValue: { sucursalId: () => null, empleadoId: () => null, userId: () => 'cajero-spec', hasPermission: () => false } },
      { provide: VentaService, useValue: ventaService },
      { provide: MedicamentoService, useValue: medicamentoService },
      { provide: ErrorNotifierService, useValue: notifier },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(continuar ? { continuar } : {}) } } },
    ],
  });
  const fixture = TestBed.createComponent(NuevaVentaComponent);
  return { fixture, component: fixture.componentInstance, ventaService, medicamentoService, notifier };
}

afterEach(() => clearUserStorage());

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

describe('NuevaVentaComponent — product cards', () => {
  const OTC = { id: 'med-1', nombreComercial: 'Paracetamol', condicionVenta: 0, precioVentaBase: 2.5, stockTotal: 8 } as MedicamentoListItem;
  const CON_RECETA = { id: 'med-2', nombreComercial: 'Amoxicilina', condicionVenta: 1, precioVentaBase: null, stockTotal: 8 } as MedicamentoListItem;

  function renderCards(): HTMLElement[] {
    const { fixture, component, medicamentoService } = setup();
    medicamentoService.search.and.returnValue(of({ items: [OTC, CON_RECETA], pageNumber: 1, totalPages: 1, totalCount: 2 }));
    component.sesionId.set('sesion-1');
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.pos3-product-card'));
  }

  it('flags only the products that are not over-the-counter as requiring a prescription', fakeAsync(() => {
    const [otc, conReceta] = renderCards();

    expect(otc.querySelector('.pos3-product-rx')).toBeNull();
    expect(conReceta.querySelector('.pos3-product-rx')?.textContent).toContain('pos.checkout.requiereReceta');
  }));

  it('shows the unit price, or a translated notice when the catalog has none', fakeAsync(() => {
    const [otc, conReceta] = renderCards();

    const precio = otc.querySelector('.pos3-product-price')?.textContent;
    expect(precio).toContain('S/ 2.50');
    expect(precio).toContain('pos.checkout.precioCadaUno');
    expect(conReceta.querySelector('.pos3-product-price')?.textContent?.trim()).toBe('pos.checkout.sinPrecioCatalogo');
  }));

  it('warns in the cart while a prescription product has no prescription selected', () => {
    const { component, ventaService } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([LOTE]));
    ventaService.presentacionesProducto.and.returnValue(of([]));

    component.selectMedicamento({ ...CON_RECETA, precioVentaBase: 2.5 });
    component.selectLote(LOTE);
    component.agregarAlCarrito();

    expect(component.cart().length).toBe(1);
    expect(component.faltaReceta()).toBeTrue();

    component.selectedRecetaId.set('receta-1');

    expect(component.faltaReceta()).toBeFalse();
  });

  it('does not warn for over-the-counter products', () => {
    const { component, ventaService } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([LOTE]));
    ventaService.presentacionesProducto.and.returnValue(of([]));

    component.selectMedicamento(OTC);
    component.selectLote(LOTE);
    component.agregarAlCarrito();

    expect(component.cart().length).toBe(1);
    expect(component.faltaReceta()).toBeFalse();
  });
});

describe('NuevaVentaComponent — payments', () => {
  it('prefills an added payment with the remaining balance', () => {
    const { component } = setup();
    component.cart.set([cartLine(4, 2.5)]);
    component.activarPagoAvanzado();
    component.updatePago(0, { monto: 4 });

    component.agregarPago();

    expect(component.pagos()[1]).toEqual({ metodoPago: MetodoPago.YapePlin, monto: 6, referencia: '' });
    expect(component.montoPendiente()).toBe(0);
  });

  it('prefills cents without floating point residue and never a negative amount', () => {
    const { component } = setup();
    component.cart.set([cartLine(3, 0.1)]);
    component.updatePago(0, { monto: 0.1 });

    component.agregarPago();

    expect(component.pagos()[1].monto).toBe(0.2);
    expect(component.montoPendiente()).toBe(0);

    component.updatePago(0, { monto: 5 });
    component.agregarPago();

    expect(component.pagos()[2].monto).toBe(0);
  });

  it('blocks checkout while a non-cash payment has no operation number', () => {
    const { component } = setup();
    component.sesionId.set('sesion-1');
    component.cart.set([cartLine(1, 2.5)]);

    component.seleccionarMetodoPagoSimple(MetodoPago.Tarjeta);

    expect(component.referenciaFaltante(component.pagos()[0])).toBeTrue();
    expect(component.puedeProcesar()).toBeFalse();

    component.updatePago(0, { referencia: '   ' });

    expect(component.puedeProcesar()).toBeFalse();

    component.updatePago(0, { referencia: 'OP-123' });

    expect(component.referenciasCompletas()).toBeTrue();
    expect(component.puedeProcesar()).toBeTrue();
  });

  it('does not ask cash payments for an operation number', () => {
    const { component } = setup();
    component.sesionId.set('sesion-1');
    component.cart.set([cartLine(1, 2.5)]);

    component.seleccionarMetodoPagoSimple(MetodoPago.Efectivo);

    expect(component.referenciasCompletas()).toBeTrue();
    expect(component.puedeProcesar()).toBeTrue();
  });

  it('shows the required-reference error and disables checkout for a card payment without reference', fakeAsync(() => {
    const { fixture, component } = setup();
    component.sesionId.set('sesion-1');
    fixture.detectChanges();
    tick(300);
    component.cart.set([cartLine(1, 2.5)]);
    component.seleccionarMetodoPagoSimple(MetodoPago.Tarjeta);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mat-error')?.textContent).toContain('pos.checkout.referenciaRequerida');
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeTrue();

    component.updatePago(0, { referencia: 'OP-123' });
    fixture.detectChanges();

    expect(host.querySelector('mat-error')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeFalse();
  }));

  for (const code of ['Venta.Pagos.ReferenciaRequerida', 'CreateVentaCommand.Pagos.ReferenciaRequerida', 'CompletarVentaCommand.Pagos.ReferenciaRequerida']) {
    it(`maps the backend code ${code} to the required-reference message`, () => {
      const { component, ventaService, notifier } = setup();
      component.sesionId.set('sesion-1');
      component.cart.set([cartLine(1, 2.5)]);
      ventaService.crear.and.returnValue(throwError(() => apiError(400, code)));

      component.guardarPendiente();

      expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.referenciaRequerida');
    });
  }
});

describe('NuevaVentaComponent — stale payments', () => {
  function conPagoDividido(): ReturnType<typeof setup> {
    const ctx = setup();
    ctx.component.cart.set([cartLine(1, 2.5), cartLine(1, 5, 'lote-2')]);
    ctx.component.activarPagoAvanzado();
    ctx.component.updatePago(0, { monto: 12 });
    ctx.component.agregarPago();
    return ctx;
  }

  it('resets the payments to a single empty cash row when the cart is emptied', () => {
    const { component } = conPagoDividido();

    component.vaciarCarrito();

    expect(component.pagos()).toEqual([PAGO_INICIAL]);
    expect(component.modoPagoAvanzado()).toBeFalse();
  });

  it('keeps the payments while lines remain and resets them when the last one is removed', () => {
    const { component } = conPagoDividido();

    component.quitarDelCarrito(0);

    expect(component.pagos().length).toBe(2);
    expect(component.pagos()[0].monto).toBe(12);

    component.quitarDelCarrito(0);

    expect(component.pagos()).toEqual([PAGO_INICIAL]);
    expect(component.modoPagoAvanzado()).toBeFalse();
  });

  it('does not keep the typed cash in the draft of a parked sale', () => {
    const { component, ventaService } = setup();
    component.sesionId.set('sesion-1');
    component.cart.set([cartLine(1, 2.5)]);
    component.updatePago(0, { monto: 12 });
    ventaService.crear.and.returnValue(of({ ventaId: 'venta-9', comprobante: null }));

    component.guardarPendiente();

    expect(ventaService.crear).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pagos: [] }));
    expect(localStorage.getItem(`${DRAFT_KEY}-venta-9`)).toBeNull();
    expect(component.pagos()).toEqual([PAGO_INICIAL]);
  });

  it('keeps only the non-cash rows that carry an operation number in the draft of a parked sale', () => {
    const { component, ventaService } = setup();
    component.sesionId.set('sesion-1');
    component.cart.set([cartLine(4, 2.5)]);
    component.activarPagoAvanzado();
    component.updatePago(0, { monto: 12 });
    component.pagos.update(pagos => [
      ...pagos,
      { metodoPago: MetodoPago.Tarjeta, monto: 3, referencia: 'OP-123' },
      { metodoPago: MetodoPago.YapePlin, monto: 2, referencia: '' },
    ]);
    ventaService.crear.and.returnValue(of({ ventaId: 'venta-9', comprobante: null }));

    component.guardarPendiente();

    const draft = parsePosDraft(localStorage.getItem(`${DRAFT_KEY}-venta-9`));
    expect(draft?.pagos).toEqual([{ metodoPago: MetodoPago.Tarjeta, monto: 3, referencia: 'OP-123' }]);
  });

  it('ignores cash left by an older draft when a parked sale is resumed', () => {
    const pagos = [{ metodoPago: MetodoPago.Efectivo, monto: 12, referencia: '' }];
    localStorage.setItem(
      `${DRAFT_KEY}-venta-9`,
      serializePosDraft({ cart: [], pagos, clienteId: null, recetaId: '', aseguradora: null, montoCubierto: null, seguroExpanded: false }),
    );
    const { component, ventaService } = setup('venta-9');
    ventaService.getById.and.returnValue(of({ id: 'venta-9', estado: 'Pendiente', detalles: [], clienteId: null } as unknown as VentaConDetalle));

    component.ngOnInit();

    expect(component.continuandoVentaId()).toBe('venta-9');
    expect(component.cargandoContinuacion()).toBeFalse();
    expect(component.pagos()).toEqual([PAGO_INICIAL]);
  });
});
