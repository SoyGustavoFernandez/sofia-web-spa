import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { LaboratoriosSearchComponent } from './laboratorios-search.component';

const BASE = `${environment.api.baseurl}/api/v1/laboratorios`;

function setup(permisos: string[]) {
  TestBed.configureTestingModule({
    imports: [LaboratoriosSearchComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
    ],
  });
  stubRouterUrl('/laboratorios');
  const fixture = TestBed.createComponent(LaboratoriosSearchComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, httpMock: TestBed.inject(HttpTestingController) };
}

function buttonLabels(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
}

describe('LaboratoriosSearchComponent — action buttons', () => {
  it('offers neither Nuevo nor Carga masiva to a user who can only read laboratories', () => {
    const { fixture } = setup(['Laboratorios:Leer']);
    const labels = buttonLabels(fixture.nativeElement as HTMLElement).join('|');

    expect(labels).not.toContain('actions.new');
    expect(labels).not.toContain('carga-masiva.btn');
    expect(labels).toContain('actions.search');
  });

  it('offers Nuevo and Carga masiva with Laboratorios:Crear', () => {
    const { fixture } = setup(['Laboratorios:Leer', 'Laboratorios:Crear']);
    const labels = buttonLabels(fixture.nativeElement as HTMLElement).join('|');

    expect(labels).toContain('actions.new');
    expect(labels).toContain('carga-masiva.btn');
  });

  it('does not offer them for a Crear permission that belongs to another module', () => {
    const { fixture } = setup(['Laboratorios:Leer', 'Proveedores:Crear']);
    const labels = buttonLabels(fixture.nativeElement as HTMLElement).join('|');

    expect(labels).not.toContain('actions.new');
    expect(labels).not.toContain('carga-masiva.btn');
  });

  it('keeps Exportar available with read access only, like the API does', () => {
    const { fixture, component, httpMock } = setup(['Laboratorios:Leer']);

    component.search();
    httpMock.expectOne(r => r.url === BASE).flush({
      items: [{ id: 'lab-1', nombreCompania: 'Laboratorio QA', codigoIdentificador: null }],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 1,
    });
    fixture.detectChanges();

    expect(buttonLabels(fixture.nativeElement as HTMLElement).join('|')).toContain('actions.export');
    httpMock.verify();
  });
});
