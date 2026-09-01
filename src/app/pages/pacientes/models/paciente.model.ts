export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface PacienteListItem {
  id: string;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario: string | null;
}

export interface PacienteDetail {
  id: string;
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario: string | null;
}

export interface CreatePacienteRequest {
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario?: string;
}

export interface UpdatePacienteRequest {
  docIdentidadGub: string;
  nombreApellidos: string;
  fechaNacimiento: string;
  contactoPrimario?: string;
}

export interface SearchPacienteParams {
  docIdentidadGub?: string;
  nombreApellidos?: string;
  fechaNacimientoDesde?: string;
  fechaNacimientoHasta?: string;
  pageNumber: number;
  pageSize: number;
}
