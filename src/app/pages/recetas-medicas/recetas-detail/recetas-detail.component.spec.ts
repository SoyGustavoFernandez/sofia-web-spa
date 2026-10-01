import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { RecetasDetailComponent } from './recetas-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/recetas`;

function setup(params: Record<string, string>, data: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    imports: [RecetasDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params), data } } },
    ],
  });
  return {
    fixture: TestBed.createComponent(RecetasDetailComponent),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

const paciente = { id: 'pac-1', nombreApellidos: 'María Quispe', docIdentidadGub: '12345678', fechaNacimiento: '1990-01-01', contactoPrimario: null };
const medico = { id: 'med-1', nombrePrescriptor: 'Dra. Rosa Díaz', numeroRegistro: 'CMP-1', direccionClinica: null };

describe('RecetasDetailComponent — /nueva (create mode)', () => {
  it('starts in edit mode without loading anything', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.isNew()).toBeTrue();
    expect(component.isEditing()).toBeTrue();
    httpMock.verify();
  });

  it('does not save without a selected patient and prescriber', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 1), repeticionesMax: 1 });

    component.guardar();

    expect(component.pacienteCtrl.hasError('required')).toBeTrue();
    expect(component.medicoCtrl.hasError('required')).toBeTrue();
    httpMock.expectNone(BASE);
    httpMock.verify();
  });

  it('posts the issue date as yyyy-MM-dd with the selected references', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectPaciente(paciente);
    component.selectMedico(medico);
    component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 5), repeticionesMax: 2, indicacionesUso: 'Cada 8 horas' });

    component.guardar();

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({
      clienteId: 'pac-1',
      medicoId: 'med-1',
      fechaExpedicion: '2026-09-05',
      repeticionesMax: 2,
      indicacionesUso: 'Cada 8 horas',
    });
    req.flush('rec-1');
    httpMock.verify();
  });

  it('maps a backend Paciente.NotFound code to its translated message', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const notifier = TestBed.inject(ErrorNotifierService);
    const showError = spyOn(notifier, 'showError');
    component.selectPaciente(paciente);
    component.selectMedico(medico);
    component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 5), repeticionesMax: 0 });

    component.guardar();

    httpMock.expectOne(BASE).flush({ code: 'Paciente.NotFound' }, { status: 404, statusText: 'Not Found' });
    expect(showError).toHaveBeenCalledWith('recetasMedicas.errors.paciente-not-found');
    expect(component.saving()).toBeFalse();
    httpMock.verify();
  });
});

describe('RecetasDetailComponent — /:id (view mode)', () => {
  it('loads the prescription and stays in view mode', () => {
    const { fixture, httpMock } = setup({ id: 'rec-1' });
    fixture.detectChanges();

    httpMock.expectOne(`${BASE}/rec-1`).flush({
      id: 'rec-1',
      clienteId: 'pac-1',
      clienteNombre: 'María Quispe',
      medicoId: 'med-1',
      medicoNombre: 'Dra. Rosa Díaz',
      fechaExpedicion: '2026-09-05',
      repeticionesMax: 1,
      indicacionesUso: null,
    });

    const component = fixture.componentInstance;
    expect(component.isNew()).toBeFalse();
    expect(component.isEditing()).toBeFalse();
    expect(component.snapshot()?.id).toBe('rec-1');
    httpMock.verify();
  });
});
