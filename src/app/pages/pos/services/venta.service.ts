import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  Venta,
  VentaConDetalle,
  VentaFilter,
  VentaExportFilters,
  CreateVentaRequest,
  CompletarVentaRequest,
  ActualizarVentaPendienteRequest,
  VentaCreada,
} from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/ventas`;

  search(filter: VentaFilter): Observable<PaginatedList<Venta>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);
    if (filter.fechaInicio) params = params.set('fechaInicio', filter.fechaInicio);
    if (filter.fechaFin) params = params.set('fechaFin', filter.fechaFin);
    if (filter.estado !== undefined && filter.estado !== null) params = params.set('estado', filter.estado);
    if (filter.empleadoId) params = params.set('empleadoId', filter.empleadoId);
    if (filter.clienteId) params = params.set('clienteId', filter.clienteId);
    return this.http.get<PaginatedList<Venta>>(this.base, { params });
  }

  getById(id: string): Observable<VentaConDetalle> {
    return this.http.get<VentaConDetalle>(`${this.base}/${id}`);
  }

  crear(body: CreateVentaRequest): Observable<VentaCreada> {
    return this.http.post<VentaCreada>(this.base, body);
  }

  completar(id: string, body: CompletarVentaRequest): Observable<VentaCreada> {
    return this.http.put<VentaCreada>(`${this.base}/${id}/completar`, body);
  }

  actualizarDetalles(id: string, body: ActualizarVentaPendienteRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/detalles`, body);
  }

  anular(id: string, motivo: string): Observable<void> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<void>(`${this.base}/${id}/anular`, JSON.stringify(motivo), { headers });
  }

  exportar(headers: string[], dateFormat: string, filters: VentaExportFilters): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, dateFormat, ...filters }, { responseType: 'blob' });
  }
}
