import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  SesionCaja,
  SesionCajaFilter,
  PaginatedList,
  AperturarCajaRequest,
  SesionCajaExportRequest,
} from '../models/sesion-caja.model';

@Injectable({ providedIn: 'root' })
export class SesionCajaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/pos`;

  search(filter: SesionCajaFilter): Observable<PaginatedList<SesionCaja>> {
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber)
      .set('pageSize', filter.pageSize);
    if (filter.sucursalId) params = params.set('sucursalId', filter.sucursalId);
    if (filter.estadoSesion !== undefined && filter.estadoSesion !== null)
      params = params.set('estadoSesion', filter.estadoSesion);
    if (filter.fechaInicio) params = params.set('fechaInicio', filter.fechaInicio);
    if (filter.fechaFin) params = params.set('fechaFin', filter.fechaFin);
    return this.http.get<PaginatedList<SesionCaja>>(`${this.base}/sesiones`, { params });
  }

  getById(id: string): Observable<{ value: SesionCaja }> {
    return this.http.get<{ value: SesionCaja }>(`${this.base}/${id}`);
  }

  aperturar(body: AperturarCajaRequest): Observable<string> {
    return this.http.post<string>(`${this.base}/apertura`, body);
  }

  cerrar(sesionId: string, montoCierre: number): Observable<string> {
    return this.http.post<string>(`${this.base}/cierre`, { sesionId, montoCierre });
  }

  exportar(body: SesionCajaExportRequest): Observable<Blob> {
    return this.http.post(`${this.base}/sesiones/exportar`, body, { responseType: 'blob' });
  }
}
