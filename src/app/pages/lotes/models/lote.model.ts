export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface Lote {
  id: string;
  productoId: string;
  nombreProducto: string;
  numeroLoteMfr: string;
  fechaFabricacion: string | null;
  fechaCaducidad: string;
}

export interface SearchLoteParams {
  productoNombre?: string;
  numeroLote?: string;
  caducidadDesde?: string;
  caducidadHasta?: string;
  fabricacionDesde?: string;
  fabricacionHasta?: string;
  pageNumber: number;
  pageSize: number;
}

export interface CreateLoteRequest {
  productoId: string;
  numeroLoteMfr: string;
  fechaFabricacion?: string | null;
  fechaCaducidad: string;
}

export interface UpdateLoteRequest {
  numeroLoteMfr: string;
  fechaFabricacion?: string | null;
  fechaCaducidad: string;
}
