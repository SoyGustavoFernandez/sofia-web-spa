export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface FormulacionClinicaListItem {
  id: string;
  productoId: string;
  productoNombre: string | null;
  ingredienteId: string;
  ingredienteNombre: string | null;
  concentracionDosis: number;
  unidadMedidaId: string;
  unidadMedidaNombre: string | null;
  codigoTeOrange: string | null;
}

export interface FormulacionClinicaDetail {
  id: string;
  productoId: string;
  productoNombre: string | null;
  ingredienteId: string;
  ingredienteNombre: string | null;
  concentracionDosis: number;
  unidadMedidaId: string;
  unidadMedidaNombre: string | null;
  codigoTeOrange: string | null;
}

export interface CreateFormulacionClinicaRequest {
  productoId: string;
  ingredienteId: string;
  concentracionDosis: number;
  unidadMedidaId: string;
  codigoTeOrange?: string;
}

export interface UpdateFormulacionClinicaRequest {
  ingredienteId: string;
  concentracionDosis: number;
  unidadMedidaId: string;
  codigoTeOrange?: string;
}

export interface SearchFormulacionClinicaParams {
  productoNombre?: string;
  ingredienteNombre?: string;
  pageNumber: number;
  pageSize: number;
}
