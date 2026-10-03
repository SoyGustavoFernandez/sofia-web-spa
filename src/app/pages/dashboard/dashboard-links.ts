import { SearchPageState } from '@core/services/shared/search-state.service';
import { EstadoVenta } from '../pos/models/venta.model';
import { EstadoSesion } from '../sesiones-caja/models/sesion-caja.model';

// A search screen plus the saved state it restores and runs on load, so a card opens its own list already filtered
export interface DashboardLink {
  path: string;
  state: SearchPageState;
}

const PRIMERA_PAGINA = { pageIndex: 0, pageSize: 10 };

export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// Collected sales of today in the user's own branch
export function ventasDeHoyLink(hoy: Date): DashboardLink {
  return ventasLink({ fechaInicio: hoy, fechaFin: hoy, estado: EstadoVenta.Completada });
}

// Collected sales of today created by the given employee
export function misVentasDeHoyLink(hoy: Date, empleadoId: string, empleadoNombre: string): DashboardLink {
  return ventasLink({ fechaInicio: hoy, fechaFin: hoy, estado: EstadoVenta.Completada, empleadoNombre, _empleadoId: empleadoId });
}

// Parked sales of any day
export function ventasEnEsperaLink(): DashboardLink {
  return ventasLink({ estado: EstadoVenta.Pendiente });
}

export function sesionesAbiertasLink(): DashboardLink {
  return {
    path: '/sesiones-caja',
    state: { formValues: { estadoSesion: EstadoSesion.Abierta, fechaInicio: null, fechaFin: null }, ...PRIMERA_PAGINA },
  };
}

// Lots with stock whose expiry day is before today
export function lotesVencidosLink(hoy: Date): DashboardLink {
  return stockLink(null, sumarDias(hoy, -1));
}

// Lots with stock expiring between the two day offsets from today, both included
export function lotesPorVencerLink(hoy: Date, desdeDias: number, hastaDias: number): DashboardLink {
  return stockLink(sumarDias(hoy, desdeDias), sumarDias(hoy, hastaDias));
}

function ventasLink(filtros: Record<string, unknown>): DashboardLink {
  return {
    path: '/pos',
    state: {
      formValues: { fechaInicio: null, fechaFin: null, estado: null, empleadoNombre: '', clienteNombre: '', ...filtros },
      ...PRIMERA_PAGINA,
    },
  };
}

function stockLink(caducidadDesde: Date | null, caducidadHasta: Date | null): DashboardLink {
  return {
    path: '/stock-por-sucursal',
    state: {
      formValues: {
        sucursalNombre: '',
        productoNombre: '',
        numeroLote: '',
        caducidadDesde,
        caducidadHasta,
        cantidadMin: null,
        cantidadMax: null,
        soloConStock: true,
      },
      ...PRIMERA_PAGINA,
    },
  };
}
