export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface DigemidCatalogoListItem {
  id: string;
  codProd: string;
  nomProd: string;
  concent: string | null;
  formaFarmaceutica: string | null;
  registroSanitario: string | null;
  titular: string | null;
  estado: string;
}

export interface DigemidCatalogoDetail {
  id: string;
  codProd: string;
  nomProd: string;
  concent: string | null;
  formaFarmaceutica: string | null;
  fraccion: string | null;
  registroSanitario: string | null;
  titular: string | null;
  estado: string;
}

export interface CreateDigemidCatalogoRequest {
  codProd: string;
  nomProd: string;
  concent?: string;
  formaFarmaceutica?: string;
  fraccion?: string;
  registroSanitario?: string;
  titular?: string;
  estado: string;
}

export interface UpdateDigemidCatalogoRequest {
  id: string;
  codProd: string;
  nomProd: string;
  concent?: string;
  formaFarmaceutica?: string;
  fraccion?: string;
  registroSanitario?: string;
  titular?: string;
  estado: string;
}

export interface SearchDigemidCatalogoParams {
  codProd?: string;
  nomProd?: string;
  pageNumber: number;
  pageSize: number;
}
