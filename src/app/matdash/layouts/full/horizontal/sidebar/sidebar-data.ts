import { NavItem } from '../../vertical/sidebar/nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    navCap: 'Inicio',
  },
  {
    displayName: 'Dashboard',
    iconName: 'solar:widget-add-line-duotone',
    route: '/dashboard',
  },
  {
    navCap: 'Módulos SOFIA',
  },
  {
    displayName: 'POS / Ventas',
    iconName: 'solar:card-search-linear',
    route: '/pos',
  },
  {
    displayName: 'Inventario',
    iconName: 'solar:box-minimalistic-line-duotone',
    route: '/inventario',
  },
  {
    displayName: 'Recetas Médicas',
    iconName: 'solar:document-text-line-duotone',
    route: '/recetas',
  },
  {
    displayName: 'Delivery',
    iconName: 'solar:delivery-line-duotone',
    route: '/delivery',
  },
  {
    displayName: 'Servicios',
    iconName: 'solar:calendar-mark-line-duotone',
    route: '/servicios',
  },
];
