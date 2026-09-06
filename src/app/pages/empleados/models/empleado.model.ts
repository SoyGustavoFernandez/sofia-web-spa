export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface Empleado {
  id: string;
  sucursal_Base_ID: string;
  nombres: string;
  apellido_Paterno: string;
  apellido_Materno: string;
  nombre_Completo: string;
  licencia_Prof: string | null;
  sucursalNombre: string | null;
}

export interface SearchEmpleadoParams {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  licencia?: string;
  sucursalNombre?: string;
  pageNumber: number;
  pageSize: number;
}

export interface CreateEmpleadoRequest {
  sucursal_Base_ID: string;
  nombres: string;
  apellido_Paterno: string;
  apellido_Materno: string;
  licencia_Prof?: string;
}

export type UpdateEmpleadoRequest = CreateEmpleadoRequest;
