import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '@environment/environment';
import { AuthService } from '@core/auth/auth.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { toLocalDayStartIso } from '@shared/utils/date-only.util';
import { MetodoPago } from '../pos/models/venta.model';
import { DashboardCaja, DashboardDevoluciones, DashboardInventario, DashboardVentas, VentasDia } from './models/dashboard.model';
import { DashboardComponent } from './dashboard.component';

const BASE = `${environment.api.baseurl}/api/v1/dashboard`;
const CAJERO = ['Ventas:Leer', 'POS:Leer', 'Inventarios:Leer', 'Devoluciones:Leer'];
const TODOS = [...CAJERO, 'DIGEMID:Leer'];

function dia(monto: number, comprobantes: number, offsetDias = 0): VentasDia {
  return { desde: new Date(2026, 9, 2 + offsetDias).toISOString(), monto, comprobantes };
}

function ventas(overrides: Partial<DashboardVentas> = {}): DashboardVentas {
  return {
    multiSucursal: false,
    empresaCompleta: false,
    hoy: dia(150, 4),
    ayer: dia(100, 3, -1),
    ticketPromedio: 37.5,
    mias: dia(20, 1),
    porMetodoPago: [
      { metodo: MetodoPago.Efectivo, monto: 45 },
      { metodo: MetodoPago.YapePlin, monto: 15 },
      { metodo: MetodoPago.Tarjeta, monto: 30 },
      { metodo: MetodoPago.Transferencia, monto: 0 },
    ],
    pendientes: { cantidad: 2, monto: 60 },
    porSucursal: [],
    tendencia7Dias: [dia(60, 1, -6), dia(0, 0, -5), dia(0, 0, -4), dia(0, 0, -3), dia(0, 0, -2), dia(100, 3, -1), dia(150, 4)],
    topProductos: [
      { productoId: 'p1', nombre: 'Paracetamol', unidades: 10, monto: 25 },
      { productoId: 'p2', nombre: 'Ibuprofeno', unidades: 5, monto: 40 },
    ],
    ...overrides,
  };
}

const CAJA: DashboardCaja = {
  miSesion: { id: 'ses-1', sucursalNombre: 'Principal', fechaHoraApertura: '2026-10-02T13:00:00Z', montoAperturaEfectivo: 100, efectivoEsperado: 110 },
  sesionesAbiertas: [{ id: 'ses-1', sucursalNombre: 'Principal', empleadoNombre: 'Carla Caja', fechaHoraApertura: '2026-10-02T13:00:00Z', montoAperturaEfectivo: 100 }],
};
const INVENTARIO: DashboardInventario = {
  lotesVencidosConStock: 1,
  lotesVencen30: 2,
  lotesVencen60: 3,
  lotesVencen90: 4,
  productosSinStock: 5,
  productosStockBajo: 6,
  umbralStockBajo: 10,
};
const DEVOLUCIONES: DashboardDevoluciones = { cantidad: 1, montoReembolsado: 10 };

function setup(permisos: string[]) {
  const auth = {
    currentUser: () => ({ sub: 'cta-1', fullName: 'Carla Caja' }),
    empleadoId: () => 'emp-1',
    loadPermissions: () => of({ roles: [], permisos: [] }),
    hasPermission: (modulo: string, accion = 'Leer') => permisos.includes(`${modulo}:${accion}`),
  };
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, httpMock, element: fixture.nativeElement as HTMLElement };
}

// Answers every pending section request with the given data, leaving out the ones not listed
function responder(httpMock: HttpTestingController, fixture: ComponentFixture<DashboardComponent>, datos: { ventas?: DashboardVentas; caja?: DashboardCaja } = {}): void {
  httpMock.match(r => r.url === `${BASE}/ventas`).forEach(req => req.flush(datos.ventas ?? ventas()));
  httpMock.match(r => r.url === `${BASE}/caja`).forEach(req => req.flush(datos.caja ?? CAJA));
  httpMock.match(r => r.url === `${BASE}/inventario`).forEach(req => req.flush(INVENTARIO));
  httpMock.match(r => r.url === `${BASE}/cuarentena`).forEach(req => req.flush({ lotesRetenidos: 7 }));
  httpMock.match(r => r.url === `${BASE}/devoluciones`).forEach(req => req.flush(DEVOLUCIONES));
  fixture.detectChanges();
}

function texto(element: HTMLElement, testId: string): string {
  return element.querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('DashboardComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests only the sections a cashier can read, sending the start of the local day', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    const hoy = toLocalDayStartIso(new Date());

    expect(httpMock.expectOne(r => r.url === `${BASE}/ventas`).request.params.get('hoy')).toBe(hoy!);
    expect(httpMock.expectOne(r => r.url === `${BASE}/inventario`).request.params.get('hoy')).toBe(hoy!);
    expect(httpMock.expectOne(r => r.url === `${BASE}/devoluciones`).request.params.get('hoy')).toBe(hoy!);
    httpMock.expectOne(`${BASE}/caja`).flush(CAJA);
    httpMock.expectNone(`${BASE}/cuarentena`);
    responder(httpMock, fixture);

    expect(element.querySelector('[data-seccion="ventas"]')).not.toBeNull();
    expect(element.querySelector('[data-seccion="caja"]')).not.toBeNull();
    expect(element.querySelector('[data-seccion="inventario"]')).not.toBeNull();
    expect(element.querySelector('[data-seccion="devoluciones"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="cuarentena"]')).toBeNull();
    expect(element.querySelector('[data-testid="por-sucursal"]')).toBeNull();
  });

  it('makes no request and shows only the header when the user reads none of the modules', () => {
    const { fixture, httpMock, element } = setup(['Medicamentos:Leer']);
    fixture.detectChanges();

    expect(httpMock.match(() => true).length).toBe(0);
    expect(element.querySelector('header')).not.toBeNull();
    expect(element.querySelectorAll('section').length).toBe(0);
    expect(element.textContent).toContain('dashboard.header.noSections');
  });

  it('requests and shows the quarantine tile only with DIGEMID:Leer', () => {
    const { fixture, httpMock } = setup(TODOS);
    httpMock.expectOne(`${BASE}/cuarentena`).flush({ lotesRetenidos: 7 });
    responder(httpMock, fixture);

    expect(texto(fixture.nativeElement as HTMLElement, 'cuarentena')).toContain('7');
  });

  it('shows the per-branch table with the company caption in the multi-branch view and hides the own-branch links', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture, {
      ventas: ventas({
        multiSucursal: true,
        empresaCompleta: true,
        porSucursal: [
          { sucursalId: 's1', nombre: 'Norte', monto: 100, comprobantes: 3 },
          { sucursalId: 's2', nombre: 'Sur', monto: 50, comprobantes: 1 },
        ],
      }),
    });

    const tabla = texto(element, 'por-sucursal');
    expect(element.querySelectorAll('[data-testid="por-sucursal"] tr.mat-mdc-row').length).toBe(2);
    expect(tabla).toContain('dashboard.ventas.totalCompany');
    expect(tabla).toContain('S/ 150.00');
    expect(texto(element, 'vendido-hoy')).not.toContain('dashboard.ventas.linkToday');
    expect(texto(element, 'en-espera')).not.toContain('dashboard.ventas.linkParked');
  });

  it('uses the caption of the own branches when the scope is not the whole company', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture, {
      ventas: ventas({ multiSucursal: true, porSucursal: [{ sucursalId: 's1', nombre: 'Norte', monto: 150, comprobantes: 4 }] }),
    });

    expect(texto(element, 'por-sucursal')).toContain('dashboard.ventas.totalBranches');
  });

  it('hides the per-branch table and offers the sales links in the single-branch view', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);

    expect(element.querySelector('[data-testid="por-sucursal"]')).toBeNull();
    expect(texto(element, 'vendido-hoy')).toContain('dashboard.ventas.linkToday');
    expect(texto(element, 'mis-ventas')).toContain('dashboard.ventas.linkMine');
    expect(texto(element, 'en-espera')).toContain('dashboard.ventas.linkParked');
  });

  it('draws seven bars relative to the best day with today highlighted', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);

    const barras = Array.from(element.querySelectorAll<HTMLElement>('.dash-trend__bar'));
    expect(barras.map(b => b.style.height)).toEqual(['40%', '0%', '0%', '0%', '0%', '66.7%', '100%']);
    expect(barras.map(b => b.classList.contains('dash-trend__bar--today'))).toEqual([false, false, false, false, false, false, true]);
    expect(element.querySelectorAll('.dash-trend__day[role="img"][aria-label]').length).toBe(7);
  });

  it('never renders NaN when every day of the trend is zero', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    const ceros = [-6, -5, -4, -3, -2, -1, 0].map(d => dia(0, 0, d));
    responder(httpMock, fixture, {
      ventas: ventas({ hoy: dia(0, 0), ayer: dia(0, 0, -1), tendencia7Dias: ceros, porMetodoPago: [], topProductos: [] }),
    });

    const barras = Array.from(element.querySelectorAll<HTMLElement>('.dash-trend__bar'));
    expect(barras.length).toBe(7);
    expect(barras.every(b => b.style.height === '0%')).toBeTrue();
    expect(element.innerHTML).not.toContain('NaN');
  });

  it('shows the change against yesterday as a percentage when yesterday sold something', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);

    expect(texto(element, 'variacion')).toContain('+50.0%');
  });

  it('shows no percentage when yesterday sold nothing', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture, { ventas: ventas({ ayer: dia(0, 0, -1) }) });

    const variacion = texto(element, 'variacion');
    expect(variacion).not.toContain('%');
    expect(variacion).toContain('S/ 0.00');
  });

  it('keeps the other sections when one of them fails, and retries only that one', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    httpMock.expectOne(`${BASE}/caja`).flush('boom', { status: 500, statusText: 'Server Error' });
    responder(httpMock, fixture);

    const caja = element.querySelector('[data-seccion="caja"]') as HTMLElement;
    expect(caja.querySelector('[role="alert"]')?.textContent).toContain('dashboard.error.section');
    expect(texto(element, 'vendido-hoy')).toContain('S/ 150.00');
    expect(texto(element, 'lotes-vencidos')).toContain('1');
    expect(texto(element, 'devoluciones')).toContain('S/ 10.00');

    (caja.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    httpMock.expectOne(`${BASE}/caja`).flush(CAJA);
    httpMock.expectNone(`${BASE}/ventas`);
    fixture.detectChanges();

    expect(texto(element, 'efectivo-esperado')).toContain('S/ 110.00');
  });

  it('reloads every readable section when refreshing', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);

    (element.querySelector('[data-testid="actualizar"]') as HTMLButtonElement).click();

    const recargadas = ['ventas', 'caja', 'inventario', 'devoluciones'].map(seccion =>
      httpMock.match(r => r.url === `${BASE}/${seccion}`).length,
    );
    expect(recargadas).toEqual([1, 1, 1, 1]);
    httpMock.expectNone(`${BASE}/cuarentena`);
    fixture.detectChanges();
    expect(texto(element, 'actualizado')).toContain('dashboard.header.updatedAt');
    expect(texto(element, 'vendido-hoy')).toContain('S/ 150.00');
  });

  it('lists the open sessions only when the scope holds more than my own', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);
    expect(element.querySelector('[data-testid="cajas-abiertas"]')).toBeNull();

    (element.querySelector('[data-testid="actualizar"]') as HTMLButtonElement).click();
    const otra = { id: 'ses-2', sucursalNombre: 'Principal', empleadoNombre: 'Luis Rojas', fechaHoraApertura: '2026-10-02T14:00:00Z', montoAperturaEfectivo: 50 };
    responder(httpMock, fixture, { caja: { ...CAJA, sesionesAbiertas: [...CAJA.sesionesAbiertas, otra] } });

    expect(element.querySelectorAll('[data-testid="cajas-abiertas"] tr.mat-mdc-row').length).toBe(2);
  });

  it('offers to open a cash session only with POS:AperturarCaja', () => {
    const sinCaja: DashboardCaja = { miSesion: null, sesionesAbiertas: [] };

    const cajero = setup(CAJERO);
    responder(cajero.httpMock, cajero.fixture, { caja: sinCaja });
    expect(cajero.element.querySelector('[data-testid="abrir-caja"]')).toBeNull();
    cajero.httpMock.verify();

    TestBed.resetTestingModule();
    const conApertura = setup([...CAJERO, 'POS:AperturarCaja']);
    responder(conApertura.httpMock, conApertura.fixture, { caja: sinCaja });
    expect(conApertura.element.querySelector('[data-testid="abrir-caja"]')).not.toBeNull();
  });

  it('opens the sales list already filtered when a sales link is clicked', () => {
    const { fixture, httpMock, element } = setup(CAJERO);
    responder(httpMock, fixture);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    (element.querySelector('[data-testid="en-espera"] button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(['/pos']);
    expect(TestBed.inject(SearchStateService).restore('/pos')?.formValues['estado']).toBe(3);
  });
});
