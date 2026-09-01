export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface IngredienteActivoListItem {
  id: string;
  denominacionDci: string;
  codigoAtc: string;
}

export interface IngredienteActivoDetail {
  id: string;
  denominacionDci: string;
  codigoAtc: string;
}

export interface CreateIngredienteActivoRequest {
  denominacionDci: string;
  codigoAtc: string;
}

export interface UpdateIngredienteActivoRequest {
  denominacionDci: string;
  codigoAtc: string;
}

export interface SearchIngredienteActivoParams {
  denominacionDci?: string;
  codigoAtc?: string;
  pageNumber: number;
  pageSize: number;
}
