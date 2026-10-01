export enum EstadoEmpresa {
  TrialActivo = 0,
  Activo = 1,
  Suspendido = 2,
  Cancelado = 3,
}

export interface EmpresaDto {
  id: string;
  nombre: string;
  ruc: string | null;
  estado: EstadoEmpresa;
  fechaInicioTrial: string;
  fechaVencimiento: string;
  estaVigente: boolean;
  cantidadSucursales: number;
}

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string | null;
  estado: EstadoEmpresa;
  fechaVencimiento: string | null;
  estaVigente: boolean;
  cantidadSucursales: number;
}

export interface UpdateEmpresaRequest {
  nombre: string;
  ruc: string | null;
}

export interface RegistrarEmpresaRequest {
  nombreEmpresa: string;
  ruc: string;
  adminNombres: string;
  adminApellidoPaterno: string;
  adminApellidoMaterno: string | null;
  adminEmail: string;
  usuario: string;
  password: string;
}

export interface RegistrarEmpresaResponse {
  token: string;
}

export interface EmpresaExportRequest {
  headers: string[];
  yesLabel: string;
  noLabel: string;
  nombre?: string;
  estado?: EstadoEmpresa;
  fechaVencimientoDesde?: string;
  fechaVencimientoHasta?: string;
}

export interface SearchEmpresaParams {
  nombre?: string;
  estado?: EstadoEmpresa;
  fechaVencimientoDesde?: string;
  fechaVencimientoHasta?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}
