export enum EstadoEmpresa {
  TrialActivo = 0,
  Activo = 1,
  Suspendido = 2,
  Cancelado = 3,
}

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string | null;
  estado: EstadoEmpresa;
  fechaVencimiento: string | null;
  estaVigente: boolean;
  cantidadSucursales: number;
}

export interface UpdateEmpresaRequest {
  nombre: string;
  ruc: string | null;
}

export interface RegistrarEmpresaRequest {
  nombreEmpresa: string;
  usuario: string;
  password: string;
  ruc?: string | null;
}

export interface RegistrarEmpresaResponse {
  token: string;
}
