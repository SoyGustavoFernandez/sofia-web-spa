export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface SucursalListItem {
  id: string;
  nombre: string;
  direccionFisica: string;
  numeroLicencia: string;
  gerenteNombre: string | null;
}

export interface SucursalDetail {
  id: string;
  nombre: string;
  direccionFisica: string;
  numeroLicencia: string;
  gerenteId: string | null;
  gerenteNombre: string | null;
}

export interface CreateSucursalRequest {
  nombre: string;
  direccionFisica: string;
  numeroLicencia: string;
  gerenteId?: string;
}

export interface UpdateSucursalRequest {
  nombre: string;
  direccionFisica: string;
  numeroLicencia: string;
  gerenteId?: string | null;
}

export interface SearchSucursalParams {
  nombre?: string;
  numeroLicencia?: string;
  direccionFisica?: string;
  pageNumber: number;
  pageSize: number;
}

export interface EmpleadoItem {
  id: string;
  nombre_Completo: string;
}
