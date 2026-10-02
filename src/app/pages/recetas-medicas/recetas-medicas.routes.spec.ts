import { ROUTE_ACTIONS } from '@core/auth/route-permissions';
import { RECETAS_MEDICAS_ROUTES } from './recetas-medicas.routes';
import { RecetasSearchComponent } from './recetas-search/recetas-search.component';
import { RecetasDetailComponent } from './recetas-detail/recetas-detail.component';
import { RecetasScannerComponent } from './recetas-scanner/recetas-scanner.component';

describe('RECETAS_MEDICAS_ROUTES', () => {
  const byPath = (path: string) => RECETAS_MEDICAS_ROUTES.find(r => r.path === path);

  it('routes the empty path to the search page', () => {
    expect(byPath('')?.component).toBe(RecetasSearchComponent);
  });

  it('routes nueva to the detail page in new mode', () => {
    expect(byPath('nueva')?.component).toBe(RecetasDetailComponent);
    expect(byPath('nueva')?.data?.['isNew']).toBeTrue();
  });

  it('routes :id to the detail page without the new flag', () => {
    expect(byPath(':id')?.component).toBe(RecetasDetailComponent);
    expect(byPath(':id')?.data?.['isNew']).toBeUndefined();
  });

  it('keeps the scanner under escanear and declares it before :id', () => {
    expect(byPath('escanear')?.component).toBe(RecetasScannerComponent);
    const paths = RECETAS_MEDICAS_ROUTES.map(r => r.path);
    expect(paths.indexOf('escanear')).toBeLessThan(paths.indexOf(':id'));
    expect(paths.indexOf('nueva')).toBeLessThan(paths.indexOf(':id'));
  });

  it('declares every prescription route the permission guard gates by action, so a rename cannot unguard it', () => {
    const gated = Object.keys(ROUTE_ACTIONS).filter(key => key.startsWith('recetas-medicas/')).map(key => key.split('/')[1]);

    expect(gated).toContain('escanear');
    expect(gated.filter(path => !byPath(path))).toEqual([]);
  });
});
