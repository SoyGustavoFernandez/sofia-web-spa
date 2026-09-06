import { RolResponse } from '../../roles/models/rol.model';

export interface EmpleadoItem {
  id: string;
  nombre_Completo: string;
}

export interface SucursalAsignada {
  id: string;
  nombre: string;
}

export interface CuentaDto {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  nombreUsuario: string;
  cuentaActiva: boolean;
  requiereCambioClave: boolean;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  createdAt: string;
  roles: RolResponse[];
  sucursales: SucursalAsignada[];
}

export interface SearchCuentaParams {
  nombreUsuario?: string;
  nombreEmpleado?: string;
  cuentaActiva?: boolean;
  bloqueado?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface CreateCuentaRequest {
  empleadoId: string;
  nombreUsuario: string;
  password: string;
}

export interface UpdateCuentaRequest {
  cuentaActiva?: boolean;
  forzarCambioClave?: boolean;
  resetearIntentos: boolean;
}
