import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  EmpresaDto,
  UpdateEmpresaRequest,
  RegistrarEmpresaRequest,
  RegistrarEmpresaResponse,
  EmpresaExportRequest,
  SearchEmpresaParams,
  PaginatedList,
} from '../models/empresa.model';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/empresas`;

  search(params: SearchEmpresaParams): Observable<PaginatedList<EmpresaDto>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params.estado !== undefined && params.estado !== null) httpParams = httpParams.set('estado', params.estado);
    if (params.fechaVencimientoDesde) httpParams = httpParams.set('fechaVencimientoDesde', params.fechaVencimientoDesde);
    if (params.fechaVencimientoHasta) httpParams = httpParams.set('fechaVencimientoHasta', params.fechaVencimientoHasta);
    return this.http.get<PaginatedList<EmpresaDto>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<EmpresaDto> {
    return this.http.get<EmpresaDto>(`${this.base}/${id}`);
  }

  update(id: string, body: UpdateEmpresaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  register(body: RegistrarEmpresaRequest): Observable<RegistrarEmpresaResponse> {
    return this.http.post<RegistrarEmpresaResponse>(`${this.base}/registrar`, body);
  }

  exportar(request: EmpresaExportRequest): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, request, { responseType: 'blob' });
  }
}
