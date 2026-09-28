import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { SerieFiscalService } from './serie-fiscal.service';
import { PaginatedList, SerieFiscal, TipoComprobante, esPrefijoValido } from '../models/serie-fiscal.model';

const BASE = `${environment.api.baseurl}/api/v1/seriesfiscales`;

describe('SerieFiscalService', () => {
  let service: SerieFiscalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SerieFiscalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search() only appends filter params that are actually provided', () => {
    service
      .search({ pageNumber: 1, pageSize: 10, sucursalId: 's1', tipoComprobante: TipoComprobante.Boleta })
      .subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('sucursalId')).toBe('s1');
    expect(req.request.params.get('tipoComprobante')).toBe('2');
    expect(req.request.params.has('estadoSerie')).toBeFalse();
    expect(req.request.params.has('prefijoSerie')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<SerieFiscal>);
  });

  it('search() sends a Factura type even though its enum value is falsy-looking', () => {
    service.search({ pageNumber: 1, pageSize: 10, tipoComprobante: TipoComprobante.Factura }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('tipoComprobante')).toBe('1');
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 });
  });

  it('create() POSTs the payload and returns the new id', () => {
    const body = {
      sucursalId: 's1',
      tipoComprobante: TipoComprobante.Boleta,
      prefijoSerie: 'B001',
      correlativoActual: 0,
      estadoSerie: 'Activa' as const,
    };
    let result: string | undefined;

    service.create(body).subscribe(id => (result = id));

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush('new-id');
    expect(result).toBe('new-id');
  });

  it('update() and delete() hit the series-specific endpoint', () => {
    service
      .update('serie-1', {
        sucursalId: 's1',
        tipoComprobante: TipoComprobante.Factura,
        prefijoSerie: 'F001',
        correlativoActual: 3,
        estadoSerie: 'Inactiva',
      })
      .subscribe();
    service.delete('serie-1').subscribe();

    const reqs = httpMock.match(`${BASE}/serie-1`);
    expect(reqs.map(r => r.request.method)).toEqual(['PUT', 'DELETE']);
    reqs.forEach(r => r.flush(null));
  });

  it('exportar() POSTs the translated labels and filters and requests a blob', () => {
    service
      .exportar({
        headers: ['Serie'],
        dateFormat: 'dd/MM/yyyy',
        tipoLabels: { Boleta: 'Boleta' },
        estadoLabels: { Activa: 'Activa' },
        prefijoSerie: 'B0',
      })
      .subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body.prefijoSerie).toBe('B0');
    req.flush(new Blob(['x']));
  });
});

describe('esPrefijoValido', () => {
  it('applies the SUNAT letter rule per document type', () => {
    expect(esPrefijoValido(TipoComprobante.Boleta, 'B001')).toBeTrue();
    expect(esPrefijoValido(TipoComprobante.Boleta, 'F001')).toBeFalse();
    expect(esPrefijoValido(TipoComprobante.Factura, 'F001')).toBeTrue();
    expect(esPrefijoValido(TipoComprobante.NotaCredito, 'FC01')).toBeTrue();
    expect(esPrefijoValido(TipoComprobante.NotaCredito, 'PC01')).toBeFalse();
    expect(esPrefijoValido(TipoComprobante.Proforma, 'P001')).toBeTrue();
    expect(esPrefijoValido(TipoComprobante.Boleta, 'b001')).toBeFalse();
    expect(esPrefijoValido(TipoComprobante.Boleta, 'B01')).toBeFalse();
  });
});
