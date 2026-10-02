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

// Mirrors the backend CondicionVenta enum, which travels as a number
export enum CondicionVenta {
  VentaLibreOTC = 0,
  RecetaSimple = 1,
  RecetaRetenida = 2,
  Estupefaciente = 3,
}

export enum DestinoDevolucion {
  Reingreso_Venta = 0,
  Cuarentena_DIGEMID = 1,
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
  recetaId?: string | null;
  cantidadDevuelta: number;
  condicionVenta?: CondicionVenta | null;
}

export interface ComprobanteDto {
  tipo: string;
  numero: string;
  estadoAceptacion: string;
  urlVerificacion: string | null;
  urlXml: string | null;
  urlCdr: string | null;
  emisorRazonSocial: string | null;
  emisorRuc: string | null;
  sucursalDireccion: string | null;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
}

// Statuses stored in Estado_Aceptacion; Pendiente and Aceptado also appear on receipts issued before the honest status existed
const ESTADOS_COMPROBANTE = ['NoEnviado', 'Pendiente', 'Aceptado', 'Rechazado', 'Anulado'];

export function estadoComprobanteKey(estado: string): string | null {
  return ESTADOS_COMPROBANTE.includes(estado) ? `pos.estadoComprobante.${estado}` : null;
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
  clienteTipoDocumento: string | null;
  detalles: VentaDetalle[];
  comprobante: ComprobanteDto | null;
  pagos: VentaPagoDto[];
  devoluciones: VentaDevolucionDto[];
  recetaVerificadaPor: string | null;
  recetaVerificadaEn: string | null;
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
  recetaVerificada?: boolean;
}

export interface CompletarVentaRequest {
  pagos: CreateVentaPagoRequest[];
  detalles?: CreateVentaDetalleRequest[];
  clienteId?: string;
  aseguradoraId?: string;
  montoCubiertoSeguro?: number;
  recetaVerificada?: boolean;
}

export interface ActualizarVentaPendienteRequest {
  detalles: CreateVentaDetalleRequest[];
  clienteId?: string;
}

export interface VentaCreada {
  ventaId: string;
  comprobante: ComprobanteDto | null;
}

export interface VentaDevolucionDto {
  id: string;
  fecha: string;
  numeroNotaCredito: string | null;
  montoReembolsado: number | null;
  metodoReembolso: string | null;
}

export interface ProcesarDevolucionDetalleRequest {
  detalleVentaId: string;
  cantidadDevuelta: number;
  destinoFisicoLogico: DestinoDevolucion;
}

export interface ProcesarDevolucionRequest {
  comprobanteOrigenId: string;
  motivoSunatCatalogo: string;
  sustentoDescriptivo: string;
  detalles: ProcesarDevolucionDetalleRequest[];
  metodoReembolso: MetodoPago;
}

// A lot the cashier's own branch can sell right now (in stock, not expired, not quarantined)
export interface LoteDisponibleVenta {
  id: string;
  loteId: string;
  numeroLote: string;
  productoId: string;
  productoNombre: string;
  fechaCaducidad: string;
  cantidadFisica: number;
  precioVentaBase: number | null;
  condicionVenta: CondicionVenta;
}

// Company-level sale rules the POS mirrors; the backend is the one enforcing them
export interface ConfiguracionVenta {
  exigirRegistroReceta: boolean;
}

export interface LotesDisponiblesVentaParams {
  productoId?: string;
  productoNombre?: string;
}

export interface PresentacionProductoVenta {
  id: string;
  descripcion: string;
  cantidadUnidadesBase: number;
  precioVenta: number;
}
