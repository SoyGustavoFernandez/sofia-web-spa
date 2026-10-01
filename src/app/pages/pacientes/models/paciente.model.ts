export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface PacienteListItem {
  id: string;
  tipoDocumento: string | null;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario: string | null;
}

export interface PacienteDetail {
  id: string;
  tipoDocumento: string | null;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario: string | null;
}

export interface CreatePacienteRequest {
  tipoDocumento: string;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario?: string;
}

export interface UpdatePacienteRequest {
  tipoDocumento: string;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario?: string;
}

export interface SearchPacienteParams {
  tipoDocumento?: string;
  docIdentidadGub?: string;
  nombreApellidos?: string;
  fechaNacimientoDesde?: string;
  fechaNacimientoHasta?: string;
  pageNumber: number;
  pageSize: number;
}
