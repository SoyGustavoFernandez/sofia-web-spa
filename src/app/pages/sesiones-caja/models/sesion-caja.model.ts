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
  // The API sends explicit nulls (decimal?) while the session is still open
  montoCierreCalculado: number | null;
  montoCierreDeclarado: number | null;
  diferenciaArqueo: number | null;
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
  empleadoId?: string;
  estadoSesion?: EstadoSesion;
  fechaInicio?: string;
  fechaFin?: string;
  pageNumber: number;
  pageSize: number;
}

// Cashier, branch and opening time are taken from the session by the backend
export interface AperturarCajaRequest {
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
