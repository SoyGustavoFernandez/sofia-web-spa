export enum EstadoVenta {
  Completada = 0,
  Anulada = 1,
  Devuelta = 2,
  Pendiente = 3,
}

export enum MetodoPago {
  Efectivo = 0,
  YapePlin = 1,
  Tarjeta = 2,
  Transferencia = 3,
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface Venta {
  id: string;
  codigoVenta: string;
  fechaHora: string;
  total: number;
  estado: string;
  empleadoNombre: string;
  clienteNombre: string | null;
  itemsCount: number;
}

export interface VentaDetalle {
  id: string;
  loteId: string;
  productoNombre: string;
  numeroLote: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  presentacionVentaId?: string | null;
  presentacionDescripcion?: string | null;
  cantidadEnPresentacion?: number | null;
}

export interface ComprobanteDto {
  tipo: string;
  numero: string;
  estadoAceptacion: string;
  urlVerificacion: string | null;
  urlXml: string | null;
  urlCdr: string | null;
}

export interface VentaPagoDto {
  id: string;
  metodoPago: string;
  montoPagado: number;
  referenciaOperacion: string | null;
  fechaPago: string;
}

export interface VentaConDetalle {
  id: string;
  codigoVenta: string;
  fechaHora: string;
  total: number;
  estado: string;
  motivoAnulacion: string | null;
  empleadoNombre: string;
  clienteId: string | null;
  clienteNombre: string | null;
  clienteDocumento: string | null;
  detalles: VentaDetalle[];
  comprobante: ComprobanteDto | null;
  pagos: VentaPagoDto[];
}

export interface VentaFilter {
  fechaInicio?: string;
  fechaFin?: string;
  estado?: EstadoVenta;
  empleadoId?: string;
  clienteId?: string;
  pageNumber: number;
  pageSize: number;
}

export interface VentaExportFilters {
  fechaInicio?: string;
  fechaFin?: string;
  estado?: EstadoVenta;
  empleadoId?: string;
  clienteId?: string;
}

export interface CreateVentaDetalleRequest {
  loteId: string;
  cantidad: number;
  precioUnitario: number;
  costoHistorico: number;
  recetaId?: string;
  presentacionVentaId?: string;
}

export interface CreateVentaPagoRequest {
  metodoPago: MetodoPago;
  montoPagado: number;
  referenciaOperacion?: string;
}

export interface CreateVentaRequest {
  clienteId?: string;
  sesionId: string;
  detalles: CreateVentaDetalleRequest[];
  pagos: CreateVentaPagoRequest[];
  estado?: EstadoVenta;
  aseguradoraId?: string;
  montoCubiertoSeguro?: number;
}

export interface CompletarVentaRequest {
  pagos: CreateVentaPagoRequest[];
  detalles?: CreateVentaDetalleRequest[];
  clienteId?: string;
  aseguradoraId?: string;
  montoCubiertoSeguro?: number;
}

export interface ActualizarVentaPendienteRequest {
  detalles: CreateVentaDetalleRequest[];
  clienteId?: string;
}

export interface VentaCreada {
  ventaId: string;
  comprobante: ComprobanteDto | null;
}
