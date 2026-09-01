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
