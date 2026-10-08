import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, of, throwError } from 'rxjs';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService } from '@core/auth/auth.service';
import { POS_DRAFT_PREFIX, clearUserStorage, userStorageKey } from '@core/auth/user-storage';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { ItemSugerido, RecetaListItem } from '../../recetas-medicas/models/receta-medica.model';
import { CondicionVenta, EstadoVenta, LoteDisponibleVenta, MetodoPago, PresentacionProductoVenta, VentaConDetalle } from '../models/venta.model';
import { VentaService } from '../services/venta.service';
import { ComprobanteDialogData } from '../dialogs/comprobante-dialog/comprobante-dialog.component';
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
  condicionVenta: CondicionVenta.VentaLibreOTC,
};

const LOTE_RX: LoteDisponibleVenta = {
  id: 'inv-2',
  loteId: 'lote-rx',
  numeroLote: 'L-RX',
  productoId: 'med-2',
  productoNombre: 'Amoxicilina',
  fechaCaducidad: '2099-01-01T00:00:00Z',
  cantidadFisica: 8,
  precioVentaBase: 12,
  condicionVenta: CondicionVenta.RecetaSimple,
};

const PRESENTACION: PresentacionProductoVenta = { id: 'pres-1', descripcion: 'Caja x10', cantidadUnidadesBase: 10, precioVenta: 20 };

const DRAFT_KEY = userStorageKey(POS_DRAFT_PREFIX, 'cajero-spec');
const PAGO_INICIAL = { metodoPago: MetodoPago.Efectivo, monto: 0, referencia: '' };

function apiError(status: number, code?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: code ? { code } : null });
}

function cartLine(cantidad: number, precioUnitario: number, loteId = 'lote-1', condicionVenta?: CondicionVenta) {
  return { loteId, productoNombre: 'Paracetamol', numeroLote: 'L-001', cantidadDisponible: 50, cantidad, precioUnitario, condicionVenta };
}

function setup(continuar?: string, permisos: string[] = []) {
  const ventaService = jasmine.createSpyObj<VentaService>('VentaService', [
    'lotesDisponibles',
    'presentacionesProducto',
    'crear',
    'completar',
    'actualizarDetalles',
    'getById',
    'configuracion',
  ]);
  ventaService.configuracion.and.returnValue(of({ exigirRegistroReceta: false }));
  // The confirmation dialog is accepted; the receipt dialog that follows a charged sale never closes
  const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
  dialog.open.and.returnValues({ afterClosed: () => of(true) } as never, { afterClosed: () => EMPTY } as never);
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
      {
        provide: AuthService,
        useValue: {
          sucursalId: () => null,
          empleadoId: () => null,
          userId: () => 'cajero-spec',
          currentUser: () => null,
          hasPermission: (modulo: string, accion: string) => permisos.includes(`${modulo}:${accion}`),
        },
      },
      { provide: VentaService, useValue: ventaService },
      { provide: MedicamentoService, useValue: medicamentoService },
      { provide: ErrorNotifierService, useValue: notifier },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(continuar ? { continuar } : {}) } } },
    ],
  });
  TestBed.overrideComponent(NuevaVentaComponent, { add: { providers: [{ provide: MatDialog, useValue: dialog }] } });
  const fixture = TestBed.createComponent(NuevaVentaComponent);
  return { fixture, component: fixture.componentInstance, ventaService, medicamentoService, notifier, dialog };
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

describe('NuevaVentaComponent — prescription scan tab', () => {
  function renderToggle(permisos: string[]): HTMLElement | null {
    const { fixture, component } = setup(undefined, permisos);
    component.sesionId.set('sesion-1');
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.pos3-toggle');
  }

  it('hides the scan tab from a cashier without Recetas:Analizar and keeps the catalog search', fakeAsync(() => {
    const { fixture, component } = setup(undefined, ['Recetas:Leer', 'Recetas:Crear']);
    component.sesionId.set('sesion-1');
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.pos3-toggle')).toBeNull();
    expect(host.textContent).not.toContain('pos.checkout.tabReceta');
    expect(component.activeTab()).toBe('buscar');
    expect(host.querySelectorAll('.pos3-product-card').length).toBe(1);
  }));

  it('offers the scan tab with Recetas:Analizar', fakeAsync(() => {
    const toggle = renderToggle(['Recetas:Analizar']);

    expect(toggle?.textContent).toContain('pos.checkout.tabBuscar');
    expect(toggle?.textContent).toContain('pos.checkout.tabReceta');
  }));
});

describe('NuevaVentaComponent — cross-module actions', () => {
  function renderSinCaja(permisos: string[]): string {
    const { fixture } = setup(undefined, permisos);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function renderConCliente(permisos: string[]): string {
    const { fixture, component } = setup(undefined, permisos);
    component.sesionId.set('sesion-1');
    component.selectedCliente.set({ id: 'pac-1', tipoDocumento: '1', nombreApellidos: 'Cliente QA', docIdentidadGub: '12345678', fechaNacimiento: '', contactoPrimario: null });
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('offers opening the cash session from the POS only with POS:AperturarCaja', () => {
    const conPermiso = renderSinCaja(['Ventas:Crear', 'POS:AperturarCaja']);
    expect(conPermiso).toContain('pos.checkout.cajaRequeridaAviso');
    expect(conPermiso).toContain('pos.actions.aperturar');
    TestBed.resetTestingModule();

    const sinPermiso = renderSinCaja(['Ventas:Crear', 'POS:Leer']);
    expect(sinPermiso).toContain('pos.checkout.cajaRequeridaAviso');
    expect(sinPermiso).not.toContain('pos.actions.aperturar');
  });

  it('links to registering a prescription only with Recetas:Crear', () => {
    expect(renderConCliente(['Recetas:Leer', 'Recetas:Crear'])).toContain('pos.checkout.registrarReceta');
    TestBed.resetTestingModule();

    expect(renderConCliente(['Recetas:Leer'])).not.toContain('pos.checkout.registrarReceta');
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

  it('warns in the cart of a strict company while a prescription product has no prescription selected', () => {
    const { component, ventaService } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([LOTE_RX]));
    ventaService.presentacionesProducto.and.returnValue(of([]));

    component.selectMedicamento({ ...CON_RECETA, precioVentaBase: 12 });
    component.selectLote(LOTE_RX);
    component.agregarAlCarrito();

    expect(component.cart()[0].condicionVenta).toBe(CondicionVenta.RecetaSimple);
    expect(component.exigirRegistroReceta()).toBeTrue();
    expect(component.recetaAvisoKey()).toBe('checkout.recetaPendienteHint');
    expect(component.requiereVerificacionReceta()).toBeFalse();

    component.selectedRecetaId.set('receta-1');

    expect(component.recetaAvisoKey()).toBeNull();
  });

  it('does not warn for over-the-counter products', () => {
    const { component, ventaService } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([LOTE]));
    ventaService.presentacionesProducto.and.returnValue(of([]));

    component.selectMedicamento(OTC);
    component.selectLote(LOTE);
    component.agregarAlCarrito();

    expect(component.cart().length).toBe(1);
    expect(component.recetaAvisoKey()).toBeNull();
    expect(component.requiereVerificacionReceta()).toBeFalse();
  });
});

describe('NuevaVentaComponent — prescription verification', () => {
  const RECETA = { id: 'receta-1', medicoNombre: 'Dra. Rosa Díaz', fechaExpedicion: '2026-09-05', numeroReceta: null } as RecetaListItem;
  const ITEM = { nombreOficial: 'Amoxicilina', tieneStock: true, cantidadSugerida: 2 } as ItemSugerido;

  function render(ctx: ReturnType<typeof setup>): HTMLElement {
    ctx.component.sesionId.set('sesion-1');
    ctx.fixture.detectChanges();
    tick(300);
    ctx.fixture.detectChanges();
    return ctx.fixture.nativeElement as HTMLElement;
  }

  // Cart ready to be charged in cash: one line of the given sale condition and its exact amount
  function conLinea(ctx: ReturnType<typeof setup>, condicion?: CondicionVenta): void {
    ctx.component.sesionId.set('sesion-1');
    ctx.component.cart.set([cartLine(1, 12, 'lote-rx', condicion)]);
    ctx.component.updatePago(0, { monto: 12 });
  }

  it('loads the company rule once on init', () => {
    const { component, ventaService } = setup();

    component.ngOnInit();

    expect(ventaService.configuracion).toHaveBeenCalledTimes(1);
    expect(component.exigirRegistroReceta()).toBeFalse();
  });

  it('assumes a strict company when the rule cannot be loaded', () => {
    const { component, ventaService } = setup();
    component.exigirRegistroReceta.set(false);
    ventaService.configuracion.and.returnValue(throwError(() => apiError(500)));

    component.ngOnInit();

    expect(component.exigirRegistroReceta()).toBeTrue();
  });

  it('shows the checkbox and blocks checkout until it is ticked in a flexible company', fakeAsync(() => {
    const ctx = setup();
    const host = render(ctx);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.fixture.detectChanges();

    const checkbox = host.querySelector('.pos3-rx-check mat-checkbox');
    expect(checkbox?.textContent).toContain('pos.checkout.recetaVerificadaLabel');
    expect(host.querySelector('.pos3-rx-check')?.textContent).toContain('pos.checkout.recetaVerificadaHint');
    expect(host.querySelector('.pos3-cart-hint')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeTrue();
    expect(ctx.component.puedeGuardarPendiente()).toBeTrue();

    checkbox?.querySelector<HTMLInputElement>('input')?.click();
    ctx.fixture.detectChanges();

    expect(ctx.component.recetaVerificada()).toBeTrue();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeFalse();
  }));

  it('offers no checkbox for over-the-counter lines or when a prescription is selected', fakeAsync(() => {
    const ctx = setup();
    const host = render(ctx);
    conLinea(ctx, CondicionVenta.VentaLibreOTC);
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-rx-check')).toBeNull();
    expect(ctx.component.puedeProcesar()).toBeTrue();

    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.component.selectedRecetaId.set('receta-1');
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-rx-check')).toBeNull();
    expect(host.querySelector('.pos3-cart-hint')).toBeNull();
    expect(ctx.component.puedeProcesar()).toBeTrue();
  }));

  for (const condicion of [CondicionVenta.RecetaRetenida, CondicionVenta.Estupefaciente]) {
    it(`shows a hint instead of the checkbox for a controlled line (${CondicionVenta[condicion]})`, fakeAsync(() => {
      const ctx = setup();
      const host = render(ctx);
      ctx.component.cart.set([cartLine(1, 12, 'lote-rx', CondicionVenta.RecetaSimple), cartLine(1, 30, 'lote-ctrl', condicion)]);
      ctx.fixture.detectChanges();

      expect(host.querySelector('.pos3-rx-check')).toBeNull();
      expect(host.querySelector('.pos3-cart-hint')?.textContent).toContain('pos.checkout.recetaControladaHint');
    }));
  }

  it('warns that a controlled line needs the prescription number when the selected prescription has none', () => {
    const { component } = setup();
    component.exigirRegistroReceta.set(false);
    component.cart.set([cartLine(1, 30, 'lote-ctrl', CondicionVenta.RecetaRetenida)]);
    component.recetaOptions.set([RECETA]);
    component.selectedRecetaId.set('receta-1');

    expect(component.recetaAvisoKey()).toBe('checkout.recetaSinNumeroHint');

    component.recetaOptions.set([{ ...RECETA, numeroReceta: 'RE-778899' }]);

    expect(component.recetaAvisoKey()).toBeNull();
  });

  it('shows the hint instead of the checkbox in a strict company', fakeAsync(() => {
    const ctx = setup();
    ctx.ventaService.configuracion.and.returnValue(of({ exigirRegistroReceta: true }));
    const host = render(ctx);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-rx-check')).toBeNull();
    expect(host.querySelector('.pos3-cart-hint')?.textContent).toContain('pos.checkout.recetaPendienteHint');
  }));

  for (const condicion of [CondicionVenta.RecetaRetenida, CondicionVenta.Estupefaciente]) {
    it(`blocks checkout but not parking while a controlled line has no prescription (${CondicionVenta[condicion]})`, fakeAsync(() => {
      const ctx = setup();
      const host = render(ctx);
      conLinea(ctx, condicion);
      ctx.fixture.detectChanges();

      expect(host.querySelector('.pos3-cart-hint')?.textContent).toContain('pos.checkout.recetaControladaHint');
      expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeTrue();
      expect(host.querySelector<HTMLButtonElement>('.pos3-btn-secondary')?.disabled).toBeFalse();

      ctx.component.procesarVenta();

      expect(ctx.dialog.open).not.toHaveBeenCalled();
    }));
  }

  it('blocks checkout while the prescription of a controlled line has no number and allows it with a numbered one', fakeAsync(() => {
    const ctx = setup();
    const host = render(ctx);
    conLinea(ctx, CondicionVenta.RecetaRetenida);
    ctx.component.recetaOptions.set([RECETA, { ...RECETA, id: 'receta-2', numeroReceta: 'RE-778899' }]);
    ctx.component.selectedRecetaId.set('receta-1');
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-cart-hint')?.textContent).toContain('pos.checkout.recetaSinNumeroHint');
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeTrue();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-secondary')?.disabled).toBeFalse();

    ctx.component.selectedRecetaId.set('receta-2');
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-cart-hint')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeFalse();
  }));

  it('blocks checkout but not parking in a strict company until a prescription is selected', fakeAsync(() => {
    const ctx = setup();
    ctx.ventaService.configuracion.and.returnValue(of({ exigirRegistroReceta: true }));
    const host = render(ctx);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-cart-hint')?.textContent).toContain('pos.checkout.recetaPendienteHint');
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeTrue();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-secondary')?.disabled).toBeFalse();

    ctx.component.selectedRecetaId.set('receta-1');
    ctx.fixture.detectChanges();

    expect(host.querySelector('.pos3-cart-hint')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.pos3-btn-confirm')?.disabled).toBeFalse();
  }));

  it('still parks a sale whose checkout is blocked by a missing prescription', () => {
    const ctx = setup();
    conLinea(ctx, CondicionVenta.Estupefaciente);
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-9', comprobante: null }));

    expect(ctx.component.puedeProcesar()).toBeFalse();
    expect(ctx.component.puedeGuardarPendiente()).toBeTrue();

    ctx.component.guardarPendiente();

    expect(ctx.ventaService.crear).toHaveBeenCalledOnceWith(jasmine.objectContaining({ estado: EstadoVenta.Pendiente, pagos: [] }));
  });

  it('does not block checkout for lines of an old draft that carry no sale condition, even in a strict company', () => {
    const ctx = setup();
    conLinea(ctx);

    expect(ctx.component.exigirRegistroReceta()).toBeTrue();
    expect(ctx.component.recetaAvisoKey()).toBeNull();
    expect(ctx.component.puedeProcesar()).toBeTrue();
  });

  it('keeps the confirmation and checkout allowed when another simple-prescription line is added', fakeAsync(() => {
    const ctx = setup();
    render(ctx);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.component.recetaVerificada.set(true);
    ctx.fixture.detectChanges();

    ctx.component.cart.update(lines => [...lines, cartLine(1, 12, 'lote-rx-2', CondicionVenta.RecetaSimple)]);
    ctx.component.updatePago(0, { monto: 24 });
    ctx.fixture.detectChanges();

    expect(ctx.component.recetaVerificada()).toBeTrue();
    expect(ctx.component.puedeProcesar()).toBeTrue();
  }));

  it('sends recetaVerificada when a new sale is charged', () => {
    const ctx = setup();
    ctx.component.exigirRegistroReceta.set(false);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.component.recetaVerificada.set(true);
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-1', comprobante: null }));

    ctx.component.procesarVenta();

    expect(ctx.ventaService.crear).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ recetaVerificada: true, pagos: [{ metodoPago: MetodoPago.Efectivo, montoPagado: 12, referenciaOperacion: undefined }] }),
    );
  });

  it('does not claim a verification when the sale does not need one', () => {
    const ctx = setup();
    ctx.component.exigirRegistroReceta.set(false);
    conLinea(ctx, CondicionVenta.VentaLibreOTC);
    ctx.component.recetaVerificada.set(true);
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-1', comprobante: null }));

    ctx.component.procesarVenta();

    expect(ctx.ventaService.crear).toHaveBeenCalledOnceWith(jasmine.objectContaining({ recetaVerificada: false }));
  });

  it('does not send recetaVerificada when the sale is parked', () => {
    const ctx = setup();
    ctx.component.exigirRegistroReceta.set(false);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.component.recetaVerificada.set(true);
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-9', comprobante: null }));

    ctx.component.guardarPendiente();

    const request = ctx.ventaService.crear.calls.mostRecent().args[0];
    expect(request.pagos).toEqual([]);
    expect('recetaVerificada' in request).toBeFalse();
    expect(ctx.component.recetaVerificada()).toBeFalse();
  });

  it('knows the sale condition of a resumed parked sale and sends recetaVerificada only when it is collected', () => {
    const ctx = setup('venta-9');
    const detalle = { id: 'det-1', loteId: 'lote-rx', productoNombre: 'Amoxicilina', numeroLote: 'L-RX', cantidad: 1, precioUnitario: 12, subtotal: 12, cantidadDevuelta: 0, condicionVenta: CondicionVenta.RecetaSimple };
    ctx.ventaService.getById.and.returnValue(of({ id: 'venta-9', estado: 'Pendiente', detalles: [detalle], clienteId: null } as unknown as VentaConDetalle));
    ctx.ventaService.lotesDisponibles.and.returnValue(of([LOTE_RX]));
    ctx.ventaService.completar.and.returnValue(of({ ventaId: 'venta-9', comprobante: null }));
    ctx.ventaService.actualizarDetalles.and.returnValue(of(undefined));

    ctx.component.ngOnInit();
    ctx.component.sesionId.set('sesion-1');
    ctx.component.updatePago(0, { monto: 12 });

    expect(ctx.component.cart()[0].condicionVenta).toBe(CondicionVenta.RecetaSimple);
    expect(ctx.component.requiereVerificacionReceta()).toBeTrue();
    expect(ctx.component.puedeProcesar()).toBeFalse();

    ctx.component.guardarPendiente();

    expect('recetaVerificada' in ctx.ventaService.actualizarDetalles.calls.mostRecent().args[1]).toBeFalse();

    ctx.component.ngOnInit();
    ctx.component.sesionId.set('sesion-1');
    ctx.component.updatePago(0, { monto: 12 });
    ctx.component.recetaVerificada.set(true);
    ctx.component.procesarVenta();

    expect(ctx.ventaService.completar).toHaveBeenCalledOnceWith('venta-9', jasmine.objectContaining({ recetaVerificada: true }));
  });

  it('adds a scanned line with the lot price and its sale condition', () => {
    const { component, ventaService, notifier } = setup();
    component.exigirRegistroReceta.set(false);
    ventaService.lotesDisponibles.and.returnValue(of([LOTE_RX]));

    component.agregarItemDesdeReceta(ITEM);

    expect(ventaService.lotesDisponibles).toHaveBeenCalledOnceWith({ productoNombre: 'Amoxicilina' });
    expect(component.cart()).toEqual([jasmine.objectContaining({ loteId: 'lote-rx', cantidad: 2, precioUnitario: 12, condicionVenta: CondicionVenta.RecetaSimple })]);
    expect(component.subtotalBruto()).toBe(24);
    expect(component.requiereVerificacionReceta()).toBeTrue();
    expect(notifier.showError).not.toHaveBeenCalled();
  });

  it('does not add a scanned line whose lot has no price', () => {
    const { component, ventaService, notifier } = setup();
    ventaService.lotesDisponibles.and.returnValue(of([{ ...LOTE_RX, precioVentaBase: null }]));

    component.agregarItemDesdeReceta(ITEM);

    expect(component.cart()).toEqual([]);
    expect(component.itemAgregado(ITEM)).toBeFalse();
    expect(notifier.showError).toHaveBeenCalledOnceWith('pos.messages.sinPrecio');
  });

  it('offers no checkbox for lines of an old draft that carry no sale condition', () => {
    const ctx = setup();
    ctx.component.exigirRegistroReceta.set(false);
    conLinea(ctx);

    expect(ctx.component.requiereVerificacionReceta()).toBeFalse();
    expect(ctx.component.recetaAvisoKey()).toBeNull();
    expect(ctx.component.puedeProcesar()).toBeTrue();
  });

  it('offers the checkbox when the backend asks for the confirmation the POS did not offer', () => {
    const ctx = setup();
    conLinea(ctx);
    ctx.ventaService.crear.and.returnValue(throwError(() => apiError(400, 'Venta.Receta.VerificacionRequerida')));

    ctx.component.procesarVenta();

    expect(ctx.notifier.showError).toHaveBeenCalledOnceWith('pos.messages.recetaVerificacionRequerida');
    expect(ctx.component.requiereVerificacionReceta()).toBeTrue();
    expect(ctx.component.puedeProcesar()).toBeFalse();
  });

  for (const [code, key] of [
    ['Venta.Receta.NumeroRequerido', 'pos.messages.recetaNumeroRequerido'],
    ['Venta.Receta.VerificacionRequerida', 'pos.messages.recetaVerificacionRequerida'],
  ]) {
    it(`maps the backend code ${code} to its own message`, () => {
      const { component, ventaService, notifier } = setup();
      component.sesionId.set('sesion-1');
      component.cart.set([cartLine(1, 2.5)]);
      ventaService.crear.and.returnValue(throwError(() => apiError(400, code)));

      component.guardarPendiente();

      expect(notifier.showError).toHaveBeenCalledOnceWith(key);
    });
  }

  it('drops the confirmation as soon as it stops being required', fakeAsync(() => {
    const ctx = setup();
    render(ctx);
    conLinea(ctx, CondicionVenta.RecetaSimple);
    ctx.component.recetaVerificada.set(true);
    ctx.fixture.detectChanges();

    expect(ctx.component.recetaVerificada()).toBeTrue();

    ctx.component.selectedRecetaId.set('receta-1');
    ctx.fixture.detectChanges();

    expect(ctx.component.recetaVerificada()).toBeFalse();

    ctx.component.selectedRecetaId.set('');
    ctx.fixture.detectChanges();

    expect(ctx.component.requiereVerificacionReceta()).toBeTrue();
    expect(ctx.component.puedeProcesar()).toBeFalse();
  }));
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

describe('NuevaVentaComponent — receipt data', () => {
  it('hands the receipt the change and the sale presentation of each line', () => {
    const ctx = setup();
    ctx.component.sesionId.set('sesion-1');
    ctx.component.cart.set([
      { ...cartLine(10, 2.2), productoNombre: 'Paracetamol E2E2', numeroLote: 'L-A', presentacionVentaId: 'pres-1', presentacionDescripcion: 'Caja', cantidadEnPresentacion: 1, presentacionCantidadUnidadesBase: 10 },
      { ...cartLine(2, 2.5), productoNombre: 'Paracetamol E2E2', numeroLote: 'L-A' },
    ]);
    ctx.component.updatePago(0, { monto: 30 });
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-1', comprobante: null }));

    ctx.component.procesarVenta();

    const data = ctx.dialog.open.calls.mostRecent().args[1]!.data as ComprobanteDialogData;
    expect(data.total).toBe(27);
    expect(data.vuelto).toBe(3);
    expect(data.pagos).toEqual([{ metodo: 'pos.checkout.efectivo', monto: 30 }]);
    expect(data.detalles).toEqual([
      { productoNombre: 'Paracetamol E2E2', numeroLote: 'L-A', cantidad: 10, precioUnitario: 2.2, presentacionDescripcion: 'Caja', cantidadEnPresentacion: 1 },
      { productoNombre: 'Paracetamol E2E2', numeroLote: 'L-A', cantidad: 2, precioUnitario: 2.5, presentacionDescripcion: undefined, cantidadEnPresentacion: undefined },
    ]);
  });

  it('hands the receipt no change when the payment is exact', () => {
    const ctx = setup();
    ctx.component.sesionId.set('sesion-1');
    ctx.component.cart.set([cartLine(3, 2.5)]);
    ctx.component.updatePago(0, { monto: 7.5 });
    ctx.ventaService.crear.and.returnValue(of({ ventaId: 'venta-1', comprobante: null }));

    ctx.component.procesarVenta();

    expect((ctx.dialog.open.calls.mostRecent().args[1]!.data as ComprobanteDialogData).vuelto).toBe(0);
  });

  it('shows the change to hand back through the shared calculation', () => {
    const { component } = setup();
    component.cart.set([cartLine(3, 2.5)]);
    component.updatePago(0, { monto: 10 });

    expect(component.cambioAEntregar()).toBe(2.5);
  });
});
