import { appRoutes } from '../../app.routes';
import { ROUTE_ACTIONS, ROUTE_PERMISSIONS, grantsPermission, routeAction, routeModule } from './route-permissions';

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

  it('routeModule() ignores matrix parameters, so /roles;x=1 cannot skip the guard', () => {
    expect(routeModule('/roles;x=1')).toBe('Seguridad');
    expect(routeModule('/recetas-medicas;x=1/escanear')).toBe('Recetas');
  });

  it('routeAction() asks for Analizar on the prescription scanner however the URL is decorated', () => {
    expect(routeAction('/recetas-medicas/escanear')).toBe('Analizar');
    expect(routeAction('/recetas-medicas/escanear?origen=pos#top')).toBe('Analizar');
    expect(routeAction('/recetas-medicas;a=1/escanear;b=2')).toBe('Analizar');
  });

  it('routeAction() asks for nothing else on the routes that only need to read their module', () => {
    expect(routeAction('/recetas-medicas')).toBeUndefined();
    expect(routeAction('/recetas-medicas/nueva')).toBeUndefined();
    expect(routeAction('/recetas-medicas/abc-123')).toBeUndefined();
    expect(routeAction('/pos/escanear')).toBeUndefined();
    expect(routeAction('/dashboard')).toBeUndefined();
  });

  it('keys every action-gated route under a module the guard already maps', () => {
    const unmapped = Object.keys(ROUTE_ACTIONS).filter(key => !ROUTE_PERMISSIONS[key.split('/')[0]]);

    expect(unmapped).toEqual([]);
  });

  it('grantsPermission() needs the exact action, defaults to Leer and ignores case and padding', () => {
    const permisos = [{ modulo: 'ventas ', accion: 'leer' }, { modulo: 'POS', accion: 'AperturarCaja' }];

    expect(grantsPermission(['Cajero'], permisos, 'Ventas')).toBeTrue();
    expect(grantsPermission(['Cajero'], permisos, 'POS', 'AperturarCaja')).toBeTrue();
    expect(grantsPermission(['Cajero'], permisos, 'POS')).toBeFalse();
    expect(grantsPermission([], [], 'Ventas')).toBeFalse();
  });

  it('grantsPermission() lets the Admin role through without any permission, like the API does', () => {
    expect(grantsPermission(['Cajero', 'admin'], [], 'Seguridad', 'GestionarPermisos')).toBeTrue();
  });
});
