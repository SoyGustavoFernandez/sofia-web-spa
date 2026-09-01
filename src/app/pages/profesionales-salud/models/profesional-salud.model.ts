export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface ProfesionalSaludListItem {
  id: string;
  numeroRegistro: string;
  nombrePrescriptor: string;
  direccionClinica: string | null;
}

export interface ProfesionalSaludDetail {
  id: string;
  numeroRegistro: string;
  nombrePrescriptor: string;
  direccionClinica: string | null;
}

export interface CreateProfesionalSaludRequest {
  numeroRegistro: string;
  nombrePrescriptor: string;
  direccionClinica?: string;
}

export interface UpdateProfesionalSaludRequest {
  numeroRegistro: string;
  nombrePrescriptor: string;
  direccionClinica?: string;
}

export interface SearchProfesionalSaludParams {
  numeroRegistro?: string;
  nombrePrescriptor?: string;
  pageNumber: number;
  pageSize: number;
}
