import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { AuthService, UserPermission } from '@core/auth/auth.service';
import { RecetasSearchComponent } from './recetas-search.component';

const BASE = `${environment.api.baseurl}/api/v1/recetas`;
const ME = `${environment.api.baseurl}/api/v1/auth/me`;

const page = {
  items: [
    {
      id: 'rec-1',
      clienteId: 'pac-1',
      clienteNombre: 'María Quispe',
      medicoId: 'med-1',
      medicoNombre: 'Dra. Rosa Díaz',
      fechaExpedicion: '2026-09-05',
      repeticionesMax: 1,
      indicacionesUso: null,
    },
  ],
  pageNumber: 1,
  totalPages: 1,
  totalCount: 1,
};

describe('RecetasSearchComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecetasSearchComponent],
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

  function grant(permisos: UserPermission[], roles: string[] = ['Cajero']): void {
    TestBed.inject(AuthService).loadPermissions().subscribe();
    httpMock.expectOne(ME).flush({ roles, permisos });
  }

  function scanButton(fixture: { nativeElement: unknown }): HTMLButtonElement | undefined {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'));
    return buttons.find(b => b.textContent?.includes('recetasMedicas.search.btn-scan'));
  }

  it('hides the scan entry point from a user who can read and create prescriptions but not analyze them', () => {
    grant([{ modulo: 'Recetas', accion: 'Leer' }, { modulo: 'Recetas', accion: 'Crear' }]);
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.puedeEscanear()).toBeFalse();
    expect(scanButton(fixture)).toBeUndefined();
  });

  it('shows the scan entry point with Recetas:Analizar', () => {
    grant([{ modulo: 'Recetas', accion: 'Leer' }, { modulo: 'recetas', accion: 'analizar' }]);
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    fixture.detectChanges();

    expect(scanButton(fixture)).toBeDefined();
  });

  it('shows the scan entry point to an administrator without explicit permissions', () => {
    grant([], ['Admin']);
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    fixture.detectChanges();

    expect(scanButton(fixture)).toBeDefined();
  });

  it('starts with the results table hidden', () => {
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.showResults()).toBeFalse();
  });

  it('buscar() sends the selected patient and date filters and shows the results', () => {
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.selectPaciente({ id: 'pac-1', tipoDocumento: '1', nombreApellidos: 'María Quispe', docIdentidadGub: '1', fechaNacimiento: '', contactoPrimario: null });
    const desde = new Date(2026, 8, 1);
    const hasta = new Date(2026, 8, 30);
    component.form.patchValue({ fechaInicio: desde, fechaFin: hasta }, { emitEvent: false });

    component.buscar();

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.get('clienteId')).toBe('pac-1');
    expect(req.request.params.get('fechaInicio')).toBe(desde.toISOString());
    expect(req.request.params.get('fechaFin')).toBe(hasta.toISOString());
    req.flush(page);
    expect(component.showResults()).toBeTrue();
    expect(component.items().length).toBe(1);
  });

  it('limpiar() resets the filters and hides the results table', () => {
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.form.patchValue({ fechaInicio: new Date(2026, 8, 1) }, { emitEvent: false });
    component.buscar();
    httpMock.expectOne(r => r.url === BASE).flush(page);

    component.limpiar();

    expect(component.showResults()).toBeFalse();
    expect(component.items()).toEqual([]);
    expect(component.form.value.fechaInicio).toBeNull();
  });

  it('exportar() sends the date range filters', () => {
    const fixture = TestBed.createComponent(RecetasSearchComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const desde = new Date(2026, 8, 1);
    component.form.patchValue({ fechaInicio: desde }, { emitEvent: false });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    component.exportar();

    const req = httpMock.expectOne(`${BASE}/exportar`);
    expect(req.request.body.fechaInicio).toBe(desde.toISOString());
    expect(req.request.body.fechaFin).toBeUndefined();
    req.flush(new Blob());
  });
});
