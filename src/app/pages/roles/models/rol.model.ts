export interface RolResponse {
  id: string;
  nombreRol: string;
  descripcion: string | null;
  nivelJerarquia: number;
  createdAt: string;
}

export interface CreateRolRequest {
  nombreRol: string;
  descripcion?: string;
  nivelJerarquia: number;
}

export interface UpdateRolRequest {
  descripcion: string | null;
  nivelJerarquia: number;
}

export interface SearchRolParams {
  nombreRol?: string;
  descripcion?: string;
  nivelJerarquiaDesde?: number;
  nivelJerarquiaHasta?: number;
  pageNumber: number;
  pageSize: number;
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface PermisoCatalogGroup {
  modulo: string;
  acciones: string[];
}

export interface PermisoRolDto {
  id: string;
  moduloSistema: string;
  accion: string;
}

export interface SucursalRolItem {
  id: string;
  nombre: string;
  asignada: boolean;
}

export interface MenuCatalogItem {
  label: string;
  route: string;
  modules: string[];
}

export interface MenuCatalogGroup {
  label: string;
  items: MenuCatalogItem[];
}

export const MENU_CATALOG: MenuCatalogGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', route: '/dashboard', modules: [] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Empresa', route: '/empresas', modules: ['Empresas'] },
      { label: 'Sucursales', route: '/sucursales', modules: ['Sucursales'] },
      { label: 'Empleados', route: '/empleados', modules: ['Empleados'] },
      { label: 'Roles & Permisos', route: '/roles', modules: ['Seguridad'] },
      { label: 'Cuentas de Usuario', route: '/cuentas', modules: ['Seguridad'] },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { label: 'Unidades de Medida', route: '/unidades-medida', modules: ['UnidadesMedida'] },
      { label: 'Laboratorios', route: '/laboratorios', modules: ['Laboratorios'] },
      { label: 'Ingredientes Activos', route: '/ingredientes-activos', modules: ['IngredientesActivos'] },
      { label: 'Medicamentos', route: '/medicamentos', modules: ['Medicamentos'] },
      { label: 'Formulaciones Clínicas', route: '/formulaciones-clinicas', modules: ['FormulacionesClinicas'] },
      { label: 'Proveedores', route: '/proveedores', modules: ['Proveedores'] },
      { label: 'Aseguradoras', route: '/aseguradoras', modules: ['Seguros'] },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Lotes de Inventario', route: '/lotes-inventario', modules: ['Inventarios'] },
    ],
  },
  {
    label: 'Pacientes & Atención',
    items: [
      { label: 'Pacientes', route: '/pacientes', modules: ['Pacientes'] },
      { label: 'Profesionales de Salud', route: '/profesionales-salud', modules: ['ProfesionalesSalud'] },
      { label: 'Recetas Médicas', route: '/recetas', modules: ['Recetas'] },
    ],
  },
  {
    label: 'Punto de Venta',
    items: [
      { label: 'Sesiones de Caja', route: '/pos', modules: ['POS'] },
      { label: 'Ventas', route: '/ventas', modules: ['Ventas'] },
      { label: 'Devoluciones', route: '/devoluciones', modules: ['Devoluciones'] },
      { label: 'Reclamos de Seguro', route: '/reclamos-seguro', modules: ['Seguros'] },
      { label: 'Despachos Delivery', route: '/delivery', modules: ['Delivery'] },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Transferencias', route: '/transferencias', modules: ['Transferencias'] },
      { label: 'Órdenes Magistrales', route: '/magistrales', modules: ['Magistrales'] },
      { label: 'Agenda de Servicios', route: '/servicios', modules: ['Servicios'] },
      { label: 'Inmunizaciones', route: '/inmunizaciones', modules: ['Servicios'] },
    ],
  },
  {
    label: 'DIGEMID',
    items: [
      { label: 'Catálogo DIGEMID', route: '/digemid-catalogo', modules: ['DIGEMID'] },
      { label: 'Inventario Cuarentena', route: '/digemid-cuarentena', modules: ['DIGEMID'] },
      { label: 'Actas de Destrucción', route: '/digemid-actas', modules: ['DIGEMID'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Auditoría de Seguridad', route: '/auditoria', modules: ['Auditoria'] },
    ],
  },
];
