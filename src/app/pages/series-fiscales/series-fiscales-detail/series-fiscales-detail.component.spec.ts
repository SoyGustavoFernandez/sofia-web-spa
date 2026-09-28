import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { SeriesFiscalesDetailComponent } from './series-fiscales-detail.component';
import { SerieFiscal, TipoComprobante } from '../models/serie-fiscal.model';

const BASE = `${environment.api.baseurl}/api/v1/seriesfiscales`;
const SUCURSALES = `${environment.api.baseurl}/api/v1/sucursales`;

const serie = (tieneComprobantes: boolean): SerieFiscal => ({
  id: 'serie-1',
  sucursalId: 's1',
  sucursalNombre: 'Central',
  tipoComprobante: TipoComprobante.Boleta,
  prefijoSerie: 'B001',
  correlativoActual: 12,
  estadoSerie: 'Activa',
  tieneComprobantes,
  createdAt: '2026-09-01T00:00:00Z',
});

function setup(routeParams: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [SeriesFiscalesDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: activatedRouteStub(routeParams) },
    ],
  });
  const fixture = TestBed.createComponent(SeriesFiscalesDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock
    .expectOne(r => r.url === SUCURSALES)
    .flush({ items: [{ id: 's1', nombre: 'Central' }], pageNumber: 1, totalPages: 1, totalCount: 1 });
  return { fixture, component: fixture.componentInstance, httpMock };
}

describe('SeriesFiscalesDetailComponent — /nueva', () => {
  it('opens in edit mode and rejects a prefix that does not match the document type', () => {
    const { component, httpMock } = setup({});

    component.form.patchValue({ sucursalId: 's1', tipoComprobante: TipoComprobante.Factura, prefijoSerie: 'B001' });
    component.save();

    expect(component.isEditMode()).toBeTrue();
    expect(component.form.hasError('prefijoPorTipo')).toBeTrue();
    httpMock.expectNone(BASE);
    httpMock.verify();
  });

  it('save() POSTs a valid series', () => {
    const { component, httpMock } = setup({});

    component.form.patchValue({ sucursalId: 's1', tipoComprobante: TipoComprobante.Factura, prefijoSerie: 'F001', correlativoActual: 0 });
    component.save();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.prefijoSerie).toBe('F001');
    expect(req.request.body.tipoComprobante).toBe(TipoComprobante.Factura);
    req.flush('new-id');
    httpMock.verify();
  });
});

describe('SeriesFiscalesDetailComponent — /:id', () => {
  it('loads read-only and only unlocks the status once documents were issued', () => {
    const { component, httpMock } = setup({ id: 'serie-1' });
    httpMock.expectOne(`${BASE}/serie-1`).flush(serie(true));

    expect(component.form.disabled).toBeTrue();
    component.enterEditMode();

    expect(component.form.controls.estadoSerie.enabled).toBeTrue();
    expect(component.form.controls.prefijoSerie.disabled).toBeTrue();
    expect(component.form.controls.correlativoActual.disabled).toBeTrue();
    httpMock.verify();
  });

  it('unlocks every field while the series has no documents', () => {
    const { component, httpMock } = setup({ id: 'serie-1' });
    httpMock.expectOne(`${BASE}/serie-1`).flush(serie(false));

    component.enterEditMode();

    expect(component.form.enabled).toBeTrue();
    httpMock.verify();
  });
});
