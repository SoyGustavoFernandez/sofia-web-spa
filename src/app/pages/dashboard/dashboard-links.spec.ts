import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { toLocalDayEndIso, toLocalDayStartIso, toLocalMidnightIso } from '@shared/utils/date-only.util';
import { VentasSearchComponent } from '../pos/search/ventas-search.component';
import { SesionesSearchComponent } from '../sesiones-caja/sesiones-search/sesiones-search.component';
import { StockSearchComponent } from '../stock-por-sucursal/stock-search/stock-search.component';
import { EstadoVenta } from '../pos/models/venta.model';
import { EstadoSesion } from '../sesiones-caja/models/sesion-caja.model';
import {
  DashboardLink,
  lotesPorVencerLink,
  lotesVencidosLink,
  misVentasDeHoyLink,
  sesionesAbiertasLink,
  sumarDias,
  ventasDeHoyLink,
  ventasEnEsperaLink,
} from './dashboard-links';

const API = `${environment.api.baseurl}/api/v1`;
const HOY = new Date(2026, 9, 2);
const EMPTY_PAGE = { items: [], pageNumber: 1, totalPages: 0, totalCount: 0 };

// Opens the target search screen with the seed saved, as the dashboard does, and returns the search it fires on load
function abrirDestino<T>(componente: Type<T>, link: DashboardLink, urlApi: string): { form: Record<string, unknown>; req: TestRequest } {
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(['Ventas:Leer', 'POS:Leer', 'Inventarios:Leer']),
    ],
  });
  stubRouterUrl(link.path);
  TestBed.inject(SearchStateService).save(link.path, link.state);
  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  const req = TestBed.inject(HttpTestingController).expectOne(r => r.url === urlApi);
  const instancia = fixture.componentInstance as { searchForm?: { controls: Record<string, unknown> }; form?: { controls: Record<string, unknown> } };
  const form = (instancia.searchForm ?? instancia.form)?.controls ?? {};
  return { form, req };
}

// Seeds may carry the hidden ids the search screens keep next to their visible controls
function controlesSembrados(link: DashboardLink): string[] {
  return Object.keys(link.state.formValues).filter(clave => !clave.startsWith('_'));
}

describe('dashboard links', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('opens the sales of today in the sales search, collected only', () => {
    const link = ventasDeHoyLink(HOY);
    const { form, req } = abrirDestino(VentasSearchComponent, link, `${API}/ventas`);

    expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
    expect(req.request.params.get('fechaInicio')).toBe(toLocalDayStartIso(HOY)!);
    expect(req.request.params.get('fechaFin')).toBe(toLocalDayEndIso(HOY)!);
    expect(req.request.params.get('estado')).toBe(String(EstadoVenta.Completada));
    expect(req.request.params.has('empleadoId')).toBeFalse();
    req.flush(EMPTY_PAGE);
  });

  it('opens my sales of today filtered by my employee id', () => {
    const link = misVentasDeHoyLink(HOY, 'emp-1', 'Carla Caja');
    const { form, req } = abrirDestino(VentasSearchComponent, link, `${API}/ventas`);

    expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
    expect(req.request.params.get('empleadoId')).toBe('emp-1');
    expect(req.request.params.get('fechaInicio')).toBe(toLocalDayStartIso(HOY)!);
    expect(req.request.params.get('estado')).toBe(String(EstadoVenta.Completada));
    req.flush(EMPTY_PAGE);
  });

  it('opens every parked sale whatever its day', () => {
    const link = ventasEnEsperaLink();
    const { form, req } = abrirDestino(VentasSearchComponent, link, `${API}/ventas`);

    expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
    expect(req.request.params.get('estado')).toBe(String(EstadoVenta.Pendiente));
    expect(req.request.params.has('fechaInicio')).toBeFalse();
    expect(req.request.params.has('fechaFin')).toBeFalse();
    req.flush(EMPTY_PAGE);
  });

  it('opens the open cash sessions', () => {
    const link = sesionesAbiertasLink();
    const { form, req } = abrirDestino(SesionesSearchComponent, link, `${API}/pos/sesiones`);

    expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
    expect(req.request.params.get('estadoSesion')).toBe(String(EstadoSesion.Abierta));
    req.flush(EMPTY_PAGE);
  });

  it('opens the lots with stock whose expiry day is before today', () => {
    const link = lotesVencidosLink(HOY);
    const { form, req } = abrirDestino(StockSearchComponent, link, `${API}/stockporsucursal`);

    expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
    expect(req.request.params.has('caducidadDesde')).toBeFalse();
    expect(req.request.params.get('caducidadHasta')).toBe(toLocalMidnightIso(sumarDias(HOY, -1))!);
    expect(req.request.params.get('soloConStock')).toBe('true');
    req.flush(EMPTY_PAGE);
  });

  it('opens the lots expiring in each disjoint bucket, both days included', () => {
    for (const [desde, hasta] of [[0, 30], [31, 60], [61, 90]]) {
      TestBed.resetTestingModule();
      const link = lotesPorVencerLink(HOY, desde, hasta);
      const { form, req } = abrirDestino(StockSearchComponent, link, `${API}/stockporsucursal`);

      expect(Object.keys(form)).toEqual(jasmine.arrayContaining(controlesSembrados(link)));
      expect(req.request.params.get('caducidadDesde')).toBe(toLocalMidnightIso(sumarDias(HOY, desde))!);
      expect(req.request.params.get('caducidadHasta')).toBe(toLocalMidnightIso(sumarDias(HOY, hasta))!);
      expect(req.request.params.get('soloConStock')).toBe('true');
      req.flush(EMPTY_PAGE);
      TestBed.inject(HttpTestingController).verify();
    }
  });
});
