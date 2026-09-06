export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface MedicamentoListItem {
  id: string;
  codigoNacional: string;
  nombreComercial: string;
  laboratorioId: string;
  laboratorioNombre: string;
  unidadBaseId: string;
  unidadBaseNombre: string;
  condicionVenta: number;
  stockTotal: number | null;
}

export interface StockSucursalDto {
  sucursalId: string;
  sucursalNombre: string;
  cantidadFisica: number;
}

export interface MedicamentoDetail {
  id: string;
  codigoNacional: string;
  nombreComercial: string;
  laboratorioId: string;
  laboratorioNombre: string;
  unidadBaseId: string;
  unidadBaseNombre: string;
  condicionVenta: number;
  stockTotal: number | null;
  stockPorSucursal: StockSucursalDto[] | null;
}

export interface SearchMedicamentoParams {
  codigoNacional?: string;
  nombreComercial?: string;
  laboratorioNombre?: string;
  unidadBaseNombre?: string;
  condicionVenta?: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateMedicamentoRequest {
  codigoNacional: string;
  nombreComercial: string;
  laboratorioId: string;
  unidadBaseId: string;
  condicionVenta: number;
}

export interface UpdateMedicamentoRequest {
  codigoNacional: string;
  nombreComercial: string;
  laboratorioId: string;
  unidadBaseId: string;
  condicionVenta: number;
}
