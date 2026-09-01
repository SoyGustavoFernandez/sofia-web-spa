export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface UnidadMedidaListItem {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface UnidadMedidaDetail {
  id: string;
  codigo: string;
  descripcion: string;
}

export interface CreateUnidadMedidaRequest {
  codigo: string;
  descripcion: string;
}

export interface UpdateUnidadMedidaRequest {
  codigo: string;
  descripcion: string;
}

export interface SearchUnidadMedidaParams {
  codigo?: string;
  descripcion?: string;
  pageNumber: number;
  pageSize: number;
}
