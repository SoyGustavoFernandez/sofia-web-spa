import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { SesionesSearchComponent } from './sesiones-search.component';

function buttonLabels(permisos: string[]): string[] {
  TestBed.configureTestingModule({
    imports: [SesionesSearchComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
    ],
  });
  stubRouterUrl('/sesiones-caja');
  const fixture = TestBed.createComponent(SesionesSearchComponent);
  fixture.detectChanges();
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
}

describe('SesionesSearchComponent — open cash session button', () => {
  it('offers Nuevo with POS:AperturarCaja, the permission the opening endpoint checks', () => {
    expect(buttonLabels(['POS:Leer', 'POS:AperturarCaja']).join('|')).toContain('actions.new');
  });

  it('hides Nuevo from a user who can only read cash sessions', () => {
    expect(buttonLabels(['POS:Leer']).join('|')).not.toContain('actions.new');
  });

  it('does not accept POS:Crear or POS:CerrarCaja as a permission to open a cash session', () => {
    expect(buttonLabels(['POS:Leer', 'POS:Crear', 'POS:CerrarCaja']).join('|')).not.toContain('actions.new');
  });
});
