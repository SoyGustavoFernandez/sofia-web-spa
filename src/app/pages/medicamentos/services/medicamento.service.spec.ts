import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { MedicamentoService } from './medicamento.service';
import { MedicamentoDetail, PaginatedList, MedicamentoListItem } from '../models/medicamento.model';

const BASE = `${environment.api.baseurl}/api/v1/medicamentos`;

describe('MedicamentoService', () => {
  let service: MedicamentoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicamentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCondicionesVenta() GETs the catalog endpoint', () => {
    let result: string[] | undefined;

    service.getCondicionesVenta().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${BASE}/condiciones-venta`);
    expect(req.request.method).toBe('GET');
    req.flush(['Venta libre', 'Receta médica']);

    expect(result).toEqual(['Venta libre', 'Receta médica']);
  });

  it('search() sends pagination and only the provided filters, including falsy-but-defined booleans correctly', () => {
    service
      .search({ pageNumber: 1, pageSize: 20, nombreComercial: 'Paracetamol', condicionVenta: 0, incluirStock: true })
      .subscribe();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('nombreComercial')).toBe('Paracetamol');
    expect(req.request.params.get('condicionVenta')).toBe('0');
    expect(req.request.params.get('incluirStock')).toBe('true');
    expect(req.request.params.has('laboratorioNombre')).toBeFalse();
    req.flush({ items: [], pageNumber: 1, totalPages: 0, totalCount: 0 } as PaginatedList<MedicamentoListItem>);
  });

  it('getById() requests the detail endpoint', () => {
    service.getById('med-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/med-1`);
    expect(req.request.method).toBe('GET');
    req.flush({} as MedicamentoDetail);
  });

  it('create() POSTs the new medicamento', () => {
    const body = {
      codigoNacional: 'CN-1',
      nombreComercial: 'Ibuprofeno',
      laboratorioId: 'lab-1',
      unidadBaseId: 'uom-1',
      condicionVenta: 0,
      precioVentaBase: 12.5,
    };

    service.create(body).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush('new-id');
  });

  it('update() PUTs to the medicamento-specific endpoint', () => {
    const body = {
      codigoNacional: 'CN-1',
      nombreComercial: 'Ibuprofeno 400mg',
      laboratorioId: 'lab-1',
      unidadBaseId: 'uom-1',
      condicionVenta: 0,
      precioVentaBase: 15,
    };

    service.update('med-1', body).subscribe();

    const req = httpMock.expectOne(`${BASE}/med-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('delete() DELETEs the medicamento-specific endpoint', () => {
    service.delete('med-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/med-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('exportar() requests a blob with the given headers and filters', () => {
    service.exportar(['Nombre'], { nombreComercial: 'Ibuprofeno' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({ headers: ['Nombre'], nombreComercial: 'Ibuprofeno' });
    req.flush(new Blob());
  });
});
