import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { PrecioProveedor } from '../models/proveedor.model';
import { PrecioProveedorDialogComponent } from '../precio-proveedor-dialog/precio-proveedor-dialog.component';
import { ProveedoresDetailComponent } from './proveedores-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/proveedores`;
const REGISTRAR = 'Proveedores:RegistrarPrecioProveedor';

const PROVEEDOR = { id: 'prov-1', razonSocial: 'Distribuidora SAC', taxId: '20100000001', terminosFinancieros: null, calificacionEsg: null, tasaCumplimiento: 100 };

const PRECIOS: PrecioProveedor[] = [
  { id: 'p2', productoId: 'med-1', productoNombre: 'Paracetamol 500mg', costoPorUnidadBase: 12, fechaInicioVigencia: '2026-10-08T12:00:00Z', fechaFinVigencia: null, vigente: true },
  { id: 'p1', productoId: 'med-1', productoNombre: 'Paracetamol 500mg', costoPorUnidadBase: 8.5, fechaInicioVigencia: '2026-09-01T12:00:00Z', fechaFinVigencia: '2026-10-08T12:00:00Z', vigente: false },
];

function page(items: PrecioProveedor[]) {
  return { items, pageNumber: 1, totalPages: 1, totalCount: items.length };
}

function setup(routeParams: Record<string, string>, permisos: string[] = [REGISTRAR]) {
  const notifier = jasmine.createSpyObj<ErrorNotifierService>('ErrorNotifierService', ['showError', 'showSuccess']);
  TestBed.configureTestingModule({
    imports: [ProveedoresDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
      { provide: ErrorNotifierService, useValue: notifier },
      { provide: ActivatedRoute, useValue: activatedRouteStub(routeParams) },
    ],
  });
  stubRouterUrl(routeParams['id'] ? `/proveedores/${routeParams['id']}` : '/proveedores/nueva');
  return {
    fixture: TestBed.createComponent(ProveedoresDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
    notifier,
  };
}

// Opens an existing supplier and answers its two initial requests
function openExisting(precios: PrecioProveedor[], permisos?: string[]) {
  const ctx = setup({ id: 'prov-1' }, permisos);
  ctx.fixture.detectChanges();
  ctx.httpMock.expectOne(`${BASE}/prov-1`).flush(PROVEEDOR);
  ctx.httpMock.expectOne(r => r.url === `${BASE}/prov-1/precios`).flush(page(precios));
  ctx.fixture.detectChanges();
  return ctx;
}

function host(fixture: { nativeElement: unknown }): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('ProveedoresDetailComponent — purchase prices card', () => {
  it('does not show the card nor request prices on /nueva', () => {
    const { fixture, httpMock } = setup({});

    fixture.detectChanges();

    expect(host(fixture).querySelector('#precios-card')).toBeNull();
    httpMock.expectNone(r => r.url.endsWith('/precios'));
    httpMock.verify();
  });

  it('requests the first page of prices of the supplier and renders one row per price', () => {
    const { fixture, httpMock } = setup({ id: 'prov-1' });
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/prov-1`).flush(PROVEEDOR);
    const req = httpMock.expectOne(r => r.url === `${BASE}/prov-1/precios`);
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(page(PRECIOS));
    fixture.detectChanges();

    const rows = host(fixture).querySelectorAll('#precios-card tr.mat-mdc-row:not(.mat-mdc-no-data-row)');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Paracetamol 500mg');
    expect(rows[0].textContent).toContain('S/ 12.0000');
    expect(rows[0].textContent).toContain('08/10/2026');
    expect(rows[0].textContent).toContain('proveedores.precios.vigente');
    expect(rows[1].textContent).toContain('S/ 8.5000');
    expect(rows[1].textContent).toContain('01/09/2026');
    expect(rows[1].textContent).not.toContain('proveedores.precios.vigente');
    httpMock.verify();
  });

  it('shows the empty state when the supplier has no prices', () => {
    const { fixture } = openExisting([]);

    const card = host(fixture).querySelector('#precios-card');
    expect(card?.querySelectorAll('tr.mat-mdc-row:not(.mat-mdc-no-data-row)').length).toBe(0);
    expect(card?.textContent).toContain('proveedores.precios.empty');
  });

  it('hides the card while the supplier is being edited', () => {
    const { fixture } = openExisting(PRECIOS);

    fixture.componentInstance.enterEditMode();
    fixture.detectChanges();

    expect(host(fixture).querySelector('#precios-card')).toBeNull();
  });

  it('shows the register button only with the RegistrarPrecioProveedor permission', () => {
    const conPermiso = openExisting(PRECIOS, [REGISTRAR]);
    expect(host(conPermiso.fixture).querySelector('#registrar-precio-btn')).not.toBeNull();
    TestBed.resetTestingModule();

    const sinPermiso = openExisting(PRECIOS, ['Proveedores:Leer', 'Proveedores:Actualizar', 'Proveedores:Crear']);
    expect(host(sinPermiso.fixture).querySelector('#registrar-precio-btn')).toBeNull();
    expect(host(sinPermiso.fixture).querySelector('#precios-card')).not.toBeNull();
  });

  it('opens the dialog with the supplier id and reloads the first page once a price was registered', () => {
    const { fixture, httpMock } = openExisting(PRECIOS);
    const open = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);
    fixture.componentInstance.preciosPageIndex.set(2);

    fixture.componentInstance.openRegistrarPrecio();

    expect(open).toHaveBeenCalledWith(PrecioProveedorDialogComponent, jasmine.objectContaining({ data: { proveedorId: 'prov-1' } }));
    const req = httpMock.expectOne(r => r.url === `${BASE}/prov-1/precios`);
    expect(req.request.params.get('pageNumber')).toBe('1');
    req.flush(page(PRECIOS));
    expect(fixture.componentInstance.precios().length).toBe(2);
    httpMock.verify();
  });

  it('does not reload when the dialog is cancelled', () => {
    const { fixture, httpMock } = openExisting(PRECIOS);
    const open = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance.openRegistrarPrecio();

    expect(open).toHaveBeenCalledTimes(1);
    httpMock.expectNone(r => r.url === `${BASE}/prov-1/precios`);
    httpMock.verify();
  });

  it('requests the selected page when the paginator changes', () => {
    const { fixture, httpMock } = openExisting(PRECIOS);

    fixture.componentInstance.onPreciosPageChange({ pageIndex: 1, pageSize: 5, length: 12, previousPageIndex: 0 });

    const req = httpMock.expectOne(r => r.url === `${BASE}/prov-1/precios`);
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('5');
    req.flush(page([]));
    httpMock.verify();
  });

  it('shows a translated error when the prices cannot be loaded', () => {
    const { fixture, httpMock, notifier } = setup({ id: 'prov-1' });
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/prov-1`).flush(PROVEEDOR);

    httpMock.expectOne(r => r.url === `${BASE}/prov-1/precios`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(notifier.showError).toHaveBeenCalledWith('proveedores.precios.load-error');
  });
});
