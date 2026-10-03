import { MetodoPago } from '../../pos/models/venta.model';

// Amount sold and receipts issued on one local day; desde is the instant where that day starts
export interface VentasDia {
  desde: string;
  monto: number;
  comprobantes: number;
}

export interface VentaMetodoPago {
  metodo: MetodoPago;
  monto: number;
}

export interface VentasPendientes {
  cantidad: number;
  monto: number;
}

export interface VentaSucursal {
  sucursalId: string;
  nombre: string;
  monto: number;
  comprobantes: number;
}

export interface TopProducto {
  productoId: string;
  nombre: string;
  unidades: number;
  monto: number;
}

export interface DashboardVentas {
  multiSucursal: boolean;
  empresaCompleta: boolean;
  hoy: VentasDia;
  ayer: VentasDia;
  ticketPromedio: number;
  // Null when the session has no employee to attribute sales to
  mias: VentasDia | null;
  porMetodoPago: VentaMetodoPago[];
  pendientes: VentasPendientes;
  porSucursal: VentaSucursal[];
  tendencia7Dias: VentasDia[];
  topProductos: TopProducto[];
}

export interface MiSesion {
  id: string;
  sucursalNombre: string;
  fechaHoraApertura: string;
  montoAperturaEfectivo: number;
  efectivoEsperado: number;
}

export interface SesionAbierta {
  id: string;
  sucursalNombre: string;
  empleadoNombre: string;
  fechaHoraApertura: string;
  montoAperturaEfectivo: number;
}

export interface DashboardCaja {
  miSesion: MiSesion | null;
  sesionesAbiertas: SesionAbierta[];
}

export interface DashboardInventario {
  lotesVencidosConStock: number;
  lotesVencen30: number;
  lotesVencen60: number;
  lotesVencen90: number;
  productosSinStock: number;
  productosStockBajo: number;
  umbralStockBajo: number;
}

export interface DashboardCuarentena {
  lotesRetenidos: number;
}

export interface DashboardDevoluciones {
  cantidad: number;
  montoReembolsado: number;
}
