export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface AseguradoraListItem {
  id: string;
  nombreComercial: string;
  codigoIdentificadorNacional: string;
}

export interface AseguradoraDetail {
  id: string;
  nombreComercial: string;
  codigoIdentificadorNacional: string;
}

export interface CreateAseguradoraRequest {
  nombreComercial: string;
  codigoIdentificadorNacional: string;
}

export interface UpdateAseguradoraRequest {
  id: string;
  nombreComercial: string;
  codigoIdentificadorNacional: string;
}

export interface SearchAseguradoraParams {
  nombreComercial?: string;
  codigoIdentificadorNacional?: string;
  pageNumber: number;
  pageSize: number;
}
