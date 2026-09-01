import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { RolResponse, CreateRolRequest, UpdateRolRequest, SearchRolParams, PaginatedList } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/roles`;

  search(params: SearchRolParams): Observable<PaginatedList<RolResponse>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombreRol) httpParams = httpParams.set('nombreRol', params.nombreRol);
    if (params.descripcion) httpParams = httpParams.set('descripcion', params.descripcion);
    if (params.nivelJerarquiaDesde != null) httpParams = httpParams.set('nivelJerarquiaDesde', params.nivelJerarquiaDesde);
    if (params.nivelJerarquiaHasta != null) httpParams = httpParams.set('nivelJerarquiaHasta', params.nivelJerarquiaHasta);
    return this.http.get<PaginatedList<RolResponse>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<RolResponse> {
    return this.http.get<RolResponse>(`${this.base}/${id}`);
  }

  create(body: CreateRolRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateRolRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { nombreRol?: string; descripcion?: string; nivelJerarquiaDesde?: number; nivelJerarquiaHasta?: number }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
