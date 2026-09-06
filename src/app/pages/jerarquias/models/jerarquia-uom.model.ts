export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface JerarquiaUoM {
  id: string;
  productoId: string;
  productoNombre: string;
  unidadMayorId: string;
  unidadMayorNombre: string;
  unidadMenorId: string;
  unidadMenorNombre: string;
  multiplicador: number;
}

export interface SearchJerarquiaUoMParams {
  productoNombre?: string;
  unidadMayorNombre?: string;
  unidadMenorNombre?: string;
  multiplicadorMin?: number;
  multiplicadorMax?: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateJerarquiaUoMRequest {
  productoId: string;
  unidadMayorId: string;
  unidadMenorId: string;
  multiplicador: number;
}

export type UpdateJerarquiaUoMRequest = CreateJerarquiaUoMRequest;
