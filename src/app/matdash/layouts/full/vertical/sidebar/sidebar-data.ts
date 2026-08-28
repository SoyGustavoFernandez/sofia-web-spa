import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    id: 1,
    name: 'Principal',
    children: [
      { navCap: 'Inicio' },
      {
        displayName: 'Dashboard',
        iconName: 'solar:widget-add-line-duotone',
        route: '/dashboard',
      },
    ],
  },
  {
    id: 2,
    name: 'Operaciones',
    children: [
      { navCap: 'Ventas & Caja' },
      {
        displayName: 'POS / Ventas',
        iconName: 'solar:card-search-linear',
        route: '/pos',
      },
      { navCap: 'Gestión Farmacéutica' },
      {
        displayName: 'Inventario & Lotes',
        iconName: 'solar:box-minimalistic-line-duotone',
        route: '/inventario',
      },
      {
        displayName: 'Medicamentos',
        iconName: 'solar:medical-kit-line-duotone',
        route: '/medicamentos',
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
        displayName: 'Servicios & Citas',
        iconName: 'solar:calendar-mark-line-duotone',
        route: '/servicios',
      },
    ],
  },
  {
    id: 4,
    name: 'Sistema',
    children: [
      { navCap: 'Multi-tenant' },
      {
        displayName: 'Empresas',
        iconName: 'solar:buildings-line-duotone',
        route: '/empresas',
      },
    ],
  },
  {
    id: 3,
    name: 'Administración',
    children: [
      { navCap: 'Contactos & Regulaciones' },
      {
        displayName: 'Pacientes',
        iconName: 'solar:user-line-duotone',
        route: '/pacientes',
      },
      {
        displayName: 'Proveedores',
        iconName: 'solar:shop-line-duotone',
        route: '/proveedores',
      },
      {
        displayName: 'DIGEMID / Calidad',
        iconName: 'solar:shield-check-line-duotone',
        route: '/digemid',
      },
      {
        displayName: 'Roles & Seguridad',
        iconName: 'solar:lock-keyhole-line-duotone',
        route: '/roles',
      },
    ],
  },
];
