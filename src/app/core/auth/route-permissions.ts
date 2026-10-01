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

export const READ_ACTION = 'Leer';

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
  const segment = url.split(/[/?#]/).find(part => part.length > 0) ?? '';
  return ROUTE_PERMISSIONS[segment];
}
