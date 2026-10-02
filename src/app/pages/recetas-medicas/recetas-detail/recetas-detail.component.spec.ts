import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { AuthService, UserPermission } from '@core/auth/auth.service';
import { RecetasDetailComponent } from './recetas-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/recetas`;
const ME = `${environment.api.baseurl}/api/v1/auth/me`;

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

const paciente = { id: 'pac-1', tipoDocumento: '1', nombreApellidos: 'María Quispe', docIdentidadGub: '12345678', fechaNacimiento: '1990-01-01', contactoPrimario: null };
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
      numeroReceta: undefined,
      indicacionesUso: 'Cada 8 horas',
    });
    req.flush('rec-1');
    httpMock.verify();
  });

  it('posts the trimmed prescription number', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectPaciente(paciente);
    component.selectMedico(medico);
    component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 5), repeticionesMax: 0, numeroReceta: '  RE-778899 ' });

    component.guardar();

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === BASE);
    expect(req.request.body.numeroReceta).toBe('RE-778899');
    req.flush('rec-1');
    httpMock.verify();
  });

  it('does not save a prescription number longer than the backend allows', () => {
    const { fixture, httpMock } = setup({}, { isNew: true });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectPaciente(paciente);
    component.selectMedico(medico);
    component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 5), repeticionesMax: 0, numeroReceta: '7'.repeat(31) });

    component.guardar();

    expect(component.form.controls.numeroReceta.hasError('maxlength')).toBeTrue();
    httpMock.expectNone(BASE);
    httpMock.verify();
  });

  for (const code of ['RecetaMedica.NumeroReceta', 'CreateRecetaCommand.NumeroReceta']) {
    it(`maps the backend code ${code} to the invalid-data message`, () => {
      const { fixture, httpMock } = setup({}, { isNew: true });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const showError = spyOn(TestBed.inject(ErrorNotifierService), 'showError');
      component.selectPaciente(paciente);
      component.selectMedico(medico);
      component.form.patchValue({ fechaExpedicion: new Date(2026, 8, 5), repeticionesMax: 0, numeroReceta: 'RE-1' });

      component.guardar();

      httpMock.expectOne(BASE).flush({ code }, { status: 400, statusText: 'Bad Request' });
      expect(showError).toHaveBeenCalledWith('recetasMedicas.errors.invalid-data');
      httpMock.verify();
    });
  }

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
      numeroReceta: null,
    });

    const component = fixture.componentInstance;
    expect(component.isNew()).toBeFalse();
    expect(component.isEditing()).toBeFalse();
    expect(component.snapshot()?.id).toBe('rec-1');
    httpMock.verify();
  });

  it('shows the prescription number and keeps it when the prescription is edited', () => {
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
      numeroReceta: 'RE-778899',
    });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const valores = Array.from(host.querySelectorAll<HTMLInputElement>('input')).map(i => i.value);

    expect(valores).toContain('RE-778899');
    expect(host.textContent).toContain('recetasMedicas.fields.numeroReceta');

    const component = fixture.componentInstance;
    component.startEdit();
    fixture.detectChanges();

    expect(host.textContent).toContain('recetasMedicas.hints.numeroReceta');

    component.guardar();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === `${BASE}/rec-1`);
    expect(req.request.body.numeroReceta).toBe('RE-778899');
    req.flush('rec-1');
    httpMock.expectOne(`${BASE}/rec-1`).flush({});
    httpMock.verify();
  });
});

describe('RecetasDetailComponent — delete permission', () => {
  const receta = {
    id: 'rec-1',
    clienteId: 'pac-1',
    clienteNombre: 'María Quispe',
    medicoId: 'med-1',
    medicoNombre: 'Dra. Rosa Díaz',
    fechaExpedicion: '2026-09-05',
    repeticionesMax: 1,
    indicacionesUso: null,
    numeroReceta: null,
  };

  function editExisting(permisos: UserPermission[]) {
    const { fixture, httpMock } = setup({ id: 'rec-1' });
    TestBed.inject(AuthService).loadPermissions().subscribe();
    httpMock.expectOne(ME).flush({ roles: ['Cajero'], permisos });
    fixture.detectChanges();
    httpMock.expectOne(`${BASE}/rec-1`).flush(receta);
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    httpMock.verify();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.sofia-btn-delete');
  }

  it('hides Eliminar from a user who can update prescriptions but not delete them', () => {
    const deleteButton = editExisting([{ modulo: 'Recetas', accion: 'Leer' }, { modulo: 'Recetas', accion: 'Actualizar' }]);

    expect(deleteButton).toBeNull();
  });

  it('shows Eliminar when editing an existing prescription with Recetas:Eliminar', () => {
    const deleteButton = editExisting([{ modulo: 'Recetas', accion: 'Leer' }, { modulo: 'Recetas', accion: 'Eliminar' }]);

    expect(deleteButton).not.toBeNull();
  });
});
