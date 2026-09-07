export enum EstadoSesion {
  Abierta = 0,
  Cerrada = 1,
  Cuadrada = 2,
}

export interface SesionCaja {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  empleadoId: string;
  empleadoNombre: string;
  fechaHoraApertura: string;
  fechaHoraCierre?: string;
  montoAperturaEfectivo: number;
  montoCierreCalculado?: number;
  montoCierreDeclarado?: number;
  diferenciaArqueo?: number;
  estadoSesion: EstadoSesion;
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface SesionCajaFilter {
  sucursalId?: string;
  estadoSesion?: EstadoSesion;
  fechaInicio?: string;
  fechaFin?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AperturarCajaRequest {
  sucursalId: string;
  empleadoId: string;
  fechaHoraApertura: string;
  montoAperturaEfectivo: number;
}

export interface SesionCajaExportRequest {
  headers: string[];
  dateFormat: string;
  sucursalId?: string;
  estadoSesion?: EstadoSesion;
  fechaInicio?: string;
  fechaFin?: string;
}
