import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { CargaMasivaPageComponent } from './carga-masiva-page.component';

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

  it('downloadTemplate() shows an error when the request fails', () => {
    const component = create();
    const notifier = TestBed.inject(ErrorNotifierService);
    const errorSpy = spyOn(notifier, 'showServerError');

    component.downloadTemplate();
    httpMock.expectOne(CONFIG.downloadUrl).flush(new Blob(), { status: 403, statusText: 'Forbidden' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
