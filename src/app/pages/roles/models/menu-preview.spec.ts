import { NavItem } from '@matdash/layouts/full/vertical/sidebar/nav-item/nav-item';
import { navItems } from '@matdash/layouts/full/vertical/sidebar/sidebar-data';
import { visibleNavItems } from '@matdash/layouts/full/vertical/sidebar/visible-nav-items';
import { ROUTE_PERMISSIONS, grantsPermission, routeModule } from '@core/auth/route-permissions';
import { appRoutes } from '../../../app.routes';
import { buildMenuPreview } from './menu-preview';

// Screens every signed-in user may open, so they need no permission mapping
const OPEN_ROUTES = ['/dashboard'];

function canOpenWith(permisos: { modulo: string; accion: string }[]): (route: string) => boolean {
  return route => {
    const modulo = routeModule(route);
    return !modulo || grantsPermission(['Cajero'], permisos, modulo);
  };
}

describe('buildMenuPreview', () => {
  const groups: NavItem[] = [
    { id: 1, children: [{ navCap: 'cap.home' }, { displayName: 'nav.dashboard', route: '/dashboard' }] },
    {
      id: 2,
      children: [
        { navCap: 'cap.pos' },
        { displayName: 'nav.sesionesCaja', route: '/sesiones-caja' },
        { displayName: 'nav.ventas', route: '/pos' },
      ],
    },
  ];

  it('keeps every screen of every group and flags the ones the role cannot open', () => {
    const preview = buildMenuPreview(groups, route => route !== '/pos');

    expect(preview).toEqual([
      { label: 'cap.home', items: [{ label: 'nav.dashboard', route: '/dashboard', visible: true }] },
      {
        label: 'cap.pos',
        items: [
          { label: 'nav.sesionesCaja', route: '/sesiones-caja', visible: true },
          { label: 'nav.ventas', route: '/pos', visible: false },
        ],
      },
    ]);
  });
});

describe('menu preview over the real sidebar', () => {
  const previewRoutes = buildMenuPreview(navItems, () => true).flatMap(g => g.items.map(i => i.route));

  it('lists only routes that exist in the app, so the preview never shows a screen the user cannot reach', () => {
    const shell = appRoutes.find(r => r.canActivateChild?.length);
    const appPaths = (shell?.children ?? []).map(r => `/${r.path ?? ''}`);

    expect(previewRoutes.length).toBeGreaterThan(0);
    expect(previewRoutes.filter(route => !appPaths.includes(route))).toEqual([]);
  });

  it('maps every listed route except the open ones to a permission module', () => {
    const unmapped = previewRoutes.filter(route => !OPEN_ROUTES.includes(route) && !ROUTE_PERMISSIONS[route.slice(1)]);

    expect(unmapped).toEqual([]);
  });

  it('gives every group and screen the translation key the sidebar renders', () => {
    const preview = buildMenuPreview(navItems, () => true);

    expect(preview.every(g => g.label.startsWith('breadcrumbs.'))).toBeTrue();
    expect(preview.flatMap(g => g.items).every(i => i.label.startsWith('nav.'))).toBeTrue();
  });

  it('flags as visible exactly the screens the sidebar lists for the same permissions', () => {
    const canOpen = canOpenWith([
      { modulo: 'Ventas', accion: 'Leer' },
      { modulo: 'POS', accion: 'AperturarCaja' },
      { modulo: 'pacientes', accion: 'leer' },
      { modulo: 'Inventarios', accion: 'Crear' },
    ]);

    const visibleInPreview = buildMenuPreview(navItems, canOpen).flatMap(g => g.items.filter(i => i.visible).map(i => i.route));
    const listedInSidebar = visibleNavItems(navItems, canOpen).flatMap(g => (g.children ?? []).flatMap(c => (c.route ? [c.route] : [])));

    expect(visibleInPreview).toEqual(['/dashboard', '/pos', '/pacientes']);
    expect(visibleInPreview).toEqual(listedInSidebar);
  });
});
