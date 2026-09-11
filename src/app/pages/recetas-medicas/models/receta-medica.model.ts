export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface RecetaListItem {
  id: string;
  clienteId: string;
  clienteNombre: string;
  medicoId: string;
  medicoNombre: string;
  fechaExpedicion: string; // "yyyy-MM-dd"
  repeticionesMax: number;
  indicacionesUso: string | null;
}

export interface RecetaDetail {
  id: string;
  clienteId: string;
  clienteNombre: string;
  medicoId: string;
  medicoNombre: string;
  fechaExpedicion: string; // "yyyy-MM-dd"
  repeticionesMax: number;
  indicacionesUso: string | null;
}

export interface CreateRecetaRequest {
  clienteId: string;
  medicoId: string;
  fechaExpedicion: string; // "yyyy-MM-dd"
  repeticionesMax: number;
  indicacionesUso?: string;
}

export interface UpdateRecetaRequest {
  clienteId: string;
  medicoId: string;
  fechaExpedicion: string; // "yyyy-MM-dd"
  repeticionesMax: number;
  indicacionesUso?: string;
}

export interface SearchRecetaParams {
  clienteId?: string;
  medicoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  pageNumber: number;
  pageSize: number;
}

export interface RecetaExportRequest {
  headers: string[];
  dateFormat: string;
  clienteId?: string;
  medicoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface EquivalenteMedicamento {
  medicamentoId: string;
  nombreComercial: string;
  laboratorio: string | null;
  stockDisponible: number;
  tieneStock: boolean;
}

export interface ItemSugerido {
  medicamentoId: string | null;
  nombreOficial: string;
  nombreDetectado: string | null;
  confianzaFinal: number;
  tipoSugerencia: 'Receta' | 'Recomendacion';
  razonSugerencia: string;
  validadoPorDigemid: boolean;
  cantidadSugerida: number | null;
  stockDisponible: number;
  tieneStock: boolean;
  equivalentes: EquivalenteMedicamento[];
}
