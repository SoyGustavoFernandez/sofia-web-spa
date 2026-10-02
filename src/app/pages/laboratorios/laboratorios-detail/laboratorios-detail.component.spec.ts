import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { activatedRouteStub } from '@shared/testing/activated-route-stub';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { LaboratoriosDetailComponent } from './laboratorios-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/laboratorios`;

function setup(permisos: string[]) {
  TestBed.configureTestingModule({
    imports: [LaboratoriosDetailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
      { provide: ActivatedRoute, useValue: activatedRouteStub({ id: 'lab-1' }) },
    ],
  });
  stubRouterUrl('/laboratorios/lab-1');
  const fixture = TestBed.createComponent(LaboratoriosDetailComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.expectOne(`${BASE}/lab-1`).flush({ id: 'lab-1', nombreCompania: 'Laboratorio QA', codigoIdentificador: null });
  fixture.detectChanges();
  httpMock.verify();
  return { fixture, component: fixture.componentInstance };
}

function buttonLabels(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
}

describe('LaboratoriosDetailComponent — action buttons', () => {
  it('shows the record without Editar to a user who can only read laboratories', () => {
    const { fixture, component } = setup(['Laboratorios:Leer']);

    expect(component.form.value.nombreCompania).toBe('Laboratorio QA');
    expect(buttonLabels(fixture.nativeElement as HTMLElement)).not.toContain('actions.edit');
  });

  it('offers Editar with Laboratorios:Actualizar and keeps Eliminar hidden without Laboratorios:Eliminar', () => {
    const { fixture, component } = setup(['Laboratorios:Leer', 'Laboratorios:Actualizar']);
    const host = fixture.nativeElement as HTMLElement;

    expect(buttonLabels(host)).toContain('actions.edit');

    component.enterEditMode();
    fixture.detectChanges();

    expect(buttonLabels(host)).toContain('actions.save');
    expect(host.querySelector('.sofia-btn-delete')).toBeNull();
  });

  it('offers Eliminar while editing with Laboratorios:Eliminar', () => {
    const { fixture, component } = setup(['Laboratorios:Leer', 'Laboratorios:Actualizar', 'Laboratorios:Eliminar']);

    component.enterEditMode();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.sofia-btn-delete')).not.toBeNull();
  });
});
