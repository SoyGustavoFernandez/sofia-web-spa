import { appRoutes } from '../../app.routes';
import { ROUTE_PERMISSIONS, routeModule } from './route-permissions';

// Screens every signed-in user may open: the dashboard and changing their own password
const OPEN_ROUTES = ['dashboard', 'cambiar-clave'];

describe('route-permissions', () => {
  it('maps every shell route except the open ones, so no new screen skips the permission guard', () => {
    const shell = appRoutes.find(r => r.canActivateChild?.length);
    const paths = (shell?.children ?? []).map(r => r.path ?? '').filter(p => !OPEN_ROUTES.includes(p));

    const unmapped = paths.filter(p => !ROUTE_PERMISSIONS[p]);

    expect(paths.length).toBeGreaterThan(0);
    expect(unmapped).toEqual([]);
  });

  it('routeModule() resolves the module from the first segment, ignoring ids and query strings', () => {
    expect(routeModule('/aseguradoras')).toBe('Seguros');
    expect(routeModule('/lotes/abc-123')).toBe('Inventarios');
    expect(routeModule('/pos/nueva?continuar=9')).toBe('Ventas');
    expect(routeModule('/dashboard')).toBeUndefined();
  });
});
