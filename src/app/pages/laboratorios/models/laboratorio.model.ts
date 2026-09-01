export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface LaboratorioListItem {
  id: string;
  nombreCompania: string;
  codigoIdentificador: string | null;
}

export interface LaboratorioDetail {
  id: string;
  nombreCompania: string;
  codigoIdentificador: string | null;
}

export interface CreateLaboratorioRequest {
  nombreCompania: string;
  codigoIdentificador?: string;
}

export interface UpdateLaboratorioRequest {
  nombreCompania: string;
  codigoIdentificador?: string;
}

export interface SearchLaboratorioParams {
  nombreCompania?: string;
  codigoIdentificador?: string;
  pageNumber: number;
  pageSize: number;
}
