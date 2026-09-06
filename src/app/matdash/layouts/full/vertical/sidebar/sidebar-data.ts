import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    id: 1,
    name: 'Principal',
    children: [
      { navCap: 'Inicio' },
      {
        displayName: 'nav.dashboard',
        iconName: 'solar:widget-add-line-duotone',
        route: '/dashboard',
      },
    ],
  },
  {
    id: 2,
    name: 'Administración',
    children: [
      { navCap: 'Administración' },
      {
        displayName: 'nav.empresa',
        iconName: 'solar:buildings-line-duotone',
        route: '/empresas',
      },
      {
        displayName: 'nav.sucursales',
        iconName: 'solar:shop-2-line-duotone',
        route: '/sucursales',
      },
      {
        displayName: 'nav.rolesPermisos',
        iconName: 'solar:lock-keyhole-line-duotone',
        route: '/roles',
      },
      {
        displayName: 'nav.cuentasUsuario',
        iconName: 'solar:user-id-line-duotone',
        route: '/cuentas',
      },
    ],
  },
  {
    id: 3,
    name: 'Catálogos',
    children: [
      { navCap: 'Catálogos' },
      {
        displayName: 'nav.unidadesMedida',
        iconName: 'solar:ruler-line-duotone',
        route: '/unidades-medida',
      },
      {
        displayName: 'nav.laboratorios',
        iconName: 'solar:test-tube-line-duotone',
        route: '/laboratorios',
      },
      {
        displayName: 'nav.ingredientesActivos',
        iconName: 'solar:atom-line-duotone',
        route: '/ingredientes-activos',
      },
      {
        displayName: 'nav.medicamentos',
        iconName: 'solar:pill-line-duotone',
        route: '/medicamentos',
      },
      {
        displayName: 'nav.proveedores',
        iconName: 'solar:shop-line-duotone',
        route: '/proveedores',
      },
      {
        displayName: 'nav.aseguradoras',
        iconName: 'solar:shield-user-line-duotone',
        route: '/aseguradoras',
      },
    ],
  },
  {
    id: 4,
    name: 'Pacientes & Atención',
    children: [
      { navCap: 'Pacientes & Atención' },
      {
        displayName: 'nav.pacientes',
        iconName: 'solar:user-line-duotone',
        route: '/pacientes',
      },
      {
        displayName: 'nav.profesionalesSalud',
        iconName: 'solar:stethoscope-line-duotone',
        route: '/profesionales-salud',
      },
    ],
  },
  {
    id: 5,
    name: 'DIGEMID',
    children: [
      { navCap: 'DIGEMID' },
      {
        displayName: 'nav.catalogoDigemid',
        iconName: 'solar:shield-check-line-duotone',
        route: '/digemid-catalogo',
      },
    ],
  },
];
