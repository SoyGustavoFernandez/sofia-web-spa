export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface PresentacionVenta {
  id: string;
  productoId: string;
  productoNombre: string;
  unidadVentaId: string;
  descripcion: string;
  cantidadUnidadesBase: number;
  precioVenta: number;
}

export interface SearchPresentacionVentaParams {
  productoId?: string;
  productoNombre?: string;
  descripcion?: string;
  pageNumber: number;
  pageSize: number;
}

export interface CreatePresentacionVentaRequest {
  productoId: string;
  unidadVentaId: string;
  precioVenta: number;
}

export interface UpdatePresentacionVentaRequest {
  unidadVentaId: string;
  precioVenta: number;
}
