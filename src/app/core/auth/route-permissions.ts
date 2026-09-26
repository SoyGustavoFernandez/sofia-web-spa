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
};

export const READ_ACTION = 'Leer';

// Resolves the module from the first URL segment, so nested routes (/sucursales/:id) inherit it.
export function routeModule(url: string): string | undefined {
  const segment = url.split(/[/?#]/).find(part => part.length > 0) ?? '';
  return ROUTE_PERMISSIONS[segment];
}
