export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface ProveedorListItem {
  id: string;
  razonSocial: string;
  taxId: string;
  terminosFinancieros: string | null;
  calificacionEsg: number | null;
  tasaCumplimiento: number;
}

export interface ProveedorDetail {
  id: string;
  razonSocial: string;
  taxId: string;
  terminosFinancieros: string | null;
  calificacionEsg: number | null;
  tasaCumplimiento: number;
}

export interface CreateProveedorRequest {
  razonSocial: string;
  taxId: string;
  terminosFinancieros?: string;
  calificacionEsg?: number;
  tasaCumplimiento: number;
}

export interface UpdateProveedorRequest {
  id: string;
  razonSocial: string;
  taxId: string;
  terminosFinancieros?: string;
  calificacionEsg?: number;
  tasaCumplimiento: number;
}

export interface SearchProveedorParams {
  razonSocial?: string;
  taxId?: string;
  tasaCumplimientoDesde?: number;
  tasaCumplimientoHasta?: number;
  pageNumber: number;
  pageSize: number;
}

export interface PrecioProveedor {
  id: string;
  productoId: string;
  productoNombre: string;
  costoPorUnidadBase: number;
  fechaInicioVigencia: string;
  fechaFinVigencia: string | null;
  vigente: boolean;
}

export interface RegistrarPrecioProveedorRequest {
  proveedorId: string;
  medicamentoId: string;
  precioCompra: number;
  descuentoPorcentaje: number;
}
