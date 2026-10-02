import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { EstadoSesion, SesionCaja } from '../models/sesion-caja.model';
import { SesionesDetailComponent } from './sesiones-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/pos`;

function sesion(estadoSesion: EstadoSesion): SesionCaja {
  return {
    id: 'ses-1',
    sucursalId: 'suc-1',
    sucursalNombre: 'Miraflores',
    empleadoId: 'emp-1',
    empleadoNombre: 'Cajero QA',
    fechaHoraApertura: '2026-10-02T13:00:00Z',
    montoAperturaEfectivo: 100,
    montoCierreCalculado: null,
    montoCierreDeclarado: null,
    diferenciaArqueo: null,
    estadoSesion,
  };
}

function buttonLabels(permisos: string[], estadoSesion = EstadoSesion.Abierta): string[] {
  TestBed.configureTestingModule({
    imports: [SesionesDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'ses-1' }), data: {} } } },
    ],
  });
  stubRouterUrl('/sesiones-caja/ses-1');
  const fixture = TestBed.createComponent(SesionesDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.expectOne(`${BASE}/ses-1`).flush({ value: sesion(estadoSesion) });
  fixture.detectChanges();
  httpMock.verify();
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
}

describe('SesionesDetailComponent — close cash session button', () => {
  it('offers closing an open session with POS:CerrarCaja', () => {
    expect(buttonLabels(['POS:Leer', 'POS:CerrarCaja'])).toContain('sesionesCaja.actions.cerrar-sesion');
  });

  it('hides closing from a user who can read and open cash sessions but not close them', () => {
    expect(buttonLabels(['POS:Leer', 'POS:AperturarCaja'])).not.toContain('sesionesCaja.actions.cerrar-sesion');
  });

  it('never offers closing a session that is already closed', () => {
    expect(buttonLabels(['POS:Leer', 'POS:CerrarCaja'], EstadoSesion.Cerrada)).not.toContain('sesionesCaja.actions.cerrar-sesion');
  });
});
