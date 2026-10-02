// Backend permission module that grants read access to each shell route; mirrors [HasPermission] on the API.
export const ROUTE_PERMISSIONS: Readonly<Record<string, string>> = {
  empresas: 'Empresas',
  sucursales: 'Sucursales',
  empleados: 'Empleados',
  roles: 'Seguridad',
  cuentas: 'Seguridad',
  'unidades-medida': 'UnidadesMedida',
  jerarquias: 'JerarquiasUoM',
  laboratorios: 'Laboratorios',
  'ingredientes-activos': 'IngredientesActivos',
  medicamentos: 'Medicamentos',
  'presentaciones-venta': 'PresentacionesVenta',
  'formulaciones-clinicas': 'FormulacionesClinicas',
  proveedores: 'Proveedores',
  aseguradoras: 'Seguros',
  lotes: 'Inventarios',
  'stock-por-sucursal': 'Inventarios',
  'sesiones-caja': 'POS',
  pos: 'Ventas',
  pacientes: 'Pacientes',
  'profesionales-salud': 'ProfesionalesSalud',
  'recetas-medicas': 'Recetas',
  'digemid-catalogo': 'DIGEMID',
  'series-fiscales': 'SeriesFiscales',
};

// Nested routes whose extra action is not the create rule below; keyed by their first two segments
export const ROUTE_ACTIONS: Readonly<Record<string, string>> = {
  'recetas-medicas/escanear': 'Analizar',
  'sesiones-caja/nueva': 'AperturarCaja',
  'stock-por-sucursal/nueva': 'Actualizar',
};

// Second segments that open the create form or the bulk import of any mapped route
export const CREATE_SEGMENTS: readonly string[] = ['nueva', 'nuevo', 'carga-masiva'];

export const READ_ACTION = 'Leer';
export const CREATE_ACTION = 'Crear';

export interface PermissionGrant {
  modulo: string;
  accion: string;
}

// Mirrors the API's PermissionAuthorizationHandler: Admin bypasses and names compare case-insensitively
export function grantsPermission(
  roles: readonly string[],
  permisos: readonly PermissionGrant[],
  modulo: string,
  accion: string = READ_ACTION,
): boolean {
  if (roles.some(r => sameName(r, 'Admin'))) return true;
  return permisos.some(p => sameName(p.modulo, modulo) && sameName(p.accion, accion));
}

// Same rule as the API: trimmed, ordinal and case-insensitive
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Resolves the module from the first URL segment, so nested routes (/sucursales/:id) inherit it.
export function routeModule(url: string): string | undefined {
  return ROUTE_PERMISSIONS[pathSegments(url)[0] ?? ''];
}

// Extra action the route needs on top of Leer, or undefined when reading the module is enough
export function routeAction(url: string): string | undefined {
  const [first, second] = pathSegments(url);
  if (!first || !second || !ROUTE_PERMISSIONS[first]) return undefined;
  return ROUTE_ACTIONS[`${first}/${second}`] ?? (CREATE_SEGMENTS.includes(second) ? CREATE_ACTION : undefined);
}

// Path segments without query, fragment or matrix parameters, so /roles;x=1 still resolves to roles
function pathSegments(url: string): string[] {
  return url
    .split(/[?#]/)[0]
    .split('/')
    .map(part => part.split(';')[0])
    .filter(part => part.length > 0);
}
