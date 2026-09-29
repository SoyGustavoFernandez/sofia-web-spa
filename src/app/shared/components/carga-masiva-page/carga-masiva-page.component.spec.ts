import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { CargaMasivaPageComponent, MAX_UPLOAD_MB, cargaMasivaErrorKey } from './carga-masiva-page.component';

const CONFIG: CargaMasivaConfig = {
  downloadUrl: 'https://api.test/api/v1/sucursales/plantilla',
  previewUrl: 'https://api.test/api/v1/sucursales/previsualizar',
  saveUrl: 'https://api.test/api/v1/sucursales/carga-masiva',
  backRoute: '/sucursales',
  breadcrumbs: [],
  columns: [{ key: 'nombre', label: 'fields.nombre', required: true }],
};

describe('CargaMasivaPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaMasivaPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslocoTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): CargaMasivaPageComponent {
    const fixture = TestBed.createComponent(CargaMasivaPageComponent);
    fixture.componentRef.setInput('config', CONFIG);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('downloadTemplate() fetches the template through HttpClient as a blob and never opens a raw window', () => {
    const component = create();
    const openSpy = spyOn(window, 'open');
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

    component.downloadTemplate();
    const req = httpMock.expectOne(CONFIG.downloadUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['xlsx']));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  function selectFile(component: CargaMasivaPageComponent, file: File): void {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onFileSelected({ target: input } as unknown as Event);
  }

  function xlsx(name = 'datos.xlsx', size = 10): File {
    return new File([new Uint8Array(size)], name);
  }

  it('rejects a non-.xlsx file on the client without calling the API', () => {
    const component = create();
    const errorSpy = spyOn(TestBed.inject(ErrorNotifierService), 'showError');

    selectFile(component, xlsx('datos.txt'));

    httpMock.expectNone(CONFIG.previewUrl);
    expect(errorSpy).toHaveBeenCalledOnceWith('carga-masiva.errors.invalid-file');
  });

  it('rejects a file larger than the upload limit on the client without calling the API', () => {
    const component = create();
    const errorSpy = spyOn(TestBed.inject(ErrorNotifierService), 'showError');

    selectFile(component, xlsx('datos.xlsx', MAX_UPLOAD_MB * 1024 * 1024 + 1));

    httpMock.expectNone(CONFIG.previewUrl);
    expect(errorSpy).toHaveBeenCalledOnceWith('carga-masiva.errors.too-large');
  });

  it('maps a backend rejection code of the preview to its translated message', () => {
    const component = create();
    const errorSpy = spyOn(TestBed.inject(ErrorNotifierService), 'showError');

    selectFile(component, xlsx());
    httpMock
      .expectOne(CONFIG.previewUrl)
      .flush({ code: 'CargaMasiva.Filas.Excedidas' }, { status: 400, statusText: 'Bad Request' });

    expect(errorSpy).toHaveBeenCalledOnceWith('carga-masiva.errors.too-many-rows');
    expect(component.loadingPreview()).toBeFalse();
  });

  it('cargaMasivaErrorKey() maps size, file and row-validator errors and ignores unknown ones', () => {
    const error = (status: number, code?: string) => new HttpErrorResponse({ status, error: code ? { code } : null });

    expect(cargaMasivaErrorKey(error(413))).toBe('carga-masiva.errors.too-large');
    expect(cargaMasivaErrorKey(error(400, 'CargaMasiva.Archivo.Invalido'))).toBe('carga-masiva.errors.invalid-file');
    expect(cargaMasivaErrorKey(error(400, 'CargaMasiva.Archivo.ExcedeDescompresion'))).toBe('carga-masiva.errors.decompression');
    expect(cargaMasivaErrorKey(error(400, 'CargaMasivaLaboratoriosCommand.Rows'))).toBe('carga-masiva.errors.too-many-rows');
    expect(cargaMasivaErrorKey(error(400, 'CargaMasivaLaboratoriosCommand.Rows[3].NombreCompania'))).toBe('carga-masiva.errors.invalid-rows');
    expect(cargaMasivaErrorKey(error(500))).toBeUndefined();
    expect(cargaMasivaErrorKey(new Error('x'))).toBeUndefined();
  });

  it('downloadTemplate() shows an error when the request fails', () => {
    const component = create();
    const notifier = TestBed.inject(ErrorNotifierService);
    const errorSpy = spyOn(notifier, 'showServerError');

    component.downloadTemplate();
    httpMock.expectOne(CONFIG.downloadUrl).flush(new Blob(), { status: 403, statusText: 'Forbidden' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
