export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface StockPorSucursal {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  loteId: string;
  numeroLote: string;
  productoId: string;
  productoNombre: string;
  fechaCaducidad: string;
  cantidadFisica: number;
}

export interface SearchStockParams {
  sucursalNombre?: string;
  productoNombre?: string;
  numeroLote?: string;
  caducidadDesde?: string;
  caducidadHasta?: string;
  cantidadMin?: number;
  cantidadMax?: number;
  soloConStock?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface CreateStockRequest {
  sucursalId: string;
  loteId: string;
  cantidad: number;
}

export interface StockFilters {
  sucursalNombre?: string;
  productoNombre?: string;
  numeroLote?: string;
  caducidadDesde?: string;
  caducidadHasta?: string;
  cantidadMin?: number;
  cantidadMax?: number;
  soloConStock?: boolean;
}
