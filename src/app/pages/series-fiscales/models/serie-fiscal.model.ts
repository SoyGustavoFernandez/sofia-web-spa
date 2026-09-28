export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

// Mirrors the backend TipoComprobante enum (serialized as its numeric value)
export enum TipoComprobante {
  Ticket = 0,
  Factura = 1,
  Boleta = 2,
  NotaCredito = 3,
  NotaDebito = 4,
  Proforma = 5,
}

export const TIPOS_CONFIGURABLES: readonly TipoComprobante[] = [
  TipoComprobante.Boleta,
  TipoComprobante.Factura,
  TipoComprobante.NotaCredito,
  TipoComprobante.Proforma,
];

export type EstadoSerie = 'Activa' | 'Inactiva';

export const ESTADOS_SERIE: readonly EstadoSerie[] = ['Activa', 'Inactiva'];

export interface SerieFiscal {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  tipoComprobante: TipoComprobante;
  prefijoSerie: string;
  correlativoActual: number;
  estadoSerie: EstadoSerie;
  tieneComprobantes: boolean;
  createdAt: string;
}

export interface SerieFiscalFilters {
  sucursalId?: string;
  tipoComprobante?: TipoComprobante;
  estadoSerie?: EstadoSerie;
  prefijoSerie?: string;
}

export interface SearchSerieFiscalParams extends SerieFiscalFilters {
  pageNumber: number;
  pageSize: number;
}

export interface SaveSerieFiscalRequest {
  sucursalId: string;
  tipoComprobante: TipoComprobante;
  prefijoSerie: string;
  correlativoActual: number;
  estadoSerie: EstadoSerie;
}

export interface SerieFiscalExportRequest extends SerieFiscalFilters {
  headers: string[];
  dateFormat: string;
  tipoLabels: Record<string, string>;
  estadoLabels: Record<string, string>;
}

// SUNAT prefix rule: 4 uppercase alphanumerics, boletas start with B, facturas with F, credit notes with B or F
export function esPrefijoValido(tipo: TipoComprobante | null | undefined, prefijo: string | null | undefined): boolean {
  if (!prefijo || !/^[A-Z0-9]{4}$/.test(prefijo)) return false;
  switch (tipo) {
    case TipoComprobante.Boleta:
      return prefijo.startsWith('B');
    case TipoComprobante.Factura:
      return prefijo.startsWith('F');
    case TipoComprobante.NotaCredito:
      return prefijo.startsWith('B') || prefijo.startsWith('F');
    default:
      return true;
  }
}
