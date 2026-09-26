import { NavItem } from './nav-item/nav-item';
import { visibleNavItems } from './visible-nav-items';

describe('visibleNavItems', () => {
  const groups: NavItem[] = [
    { id: 1, children: [{ navCap: 'home' }, { displayName: 'dashboard', route: '/dashboard' }] },
    {
      id: 2,
      children: [
        { navCap: 'admin' },
        { displayName: 'sucursales', route: '/sucursales' },
        { displayName: 'roles', route: '/roles' },
      ],
    },
    { id: 3, children: [{ navCap: 'pos' }, { displayName: 'pos', route: '/pos' }] },
  ];

  it('hides forbidden routes and drops groups left with only their caption', () => {
    const allowed = new Set(['/dashboard', '/sucursales']);

    const result = visibleNavItems(groups, route => allowed.has(route));

    expect(result.map(g => g.id)).toEqual([1, 2]);
    expect(result[1].children!.map(c => c.navCap ?? c.route)).toEqual(['admin', '/sucursales']);
  });

  it('keeps everything when the user can open every route', () => {
    const result = visibleNavItems(groups, () => true);

    expect(result.length).toBe(3);
    expect(result[1].children!.length).toBe(3);
  });

  it('does not mutate the static navigation data', () => {
    visibleNavItems(groups, () => false);

    expect(groups[1].children!.length).toBe(3);
  });
});
