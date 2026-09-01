import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  UnidadMedidaListItem,
  UnidadMedidaDetail,
  CreateUnidadMedidaRequest,
  UpdateUnidadMedidaRequest,
  SearchUnidadMedidaParams,
} from '../models/unidad-medida.model';

@Injectable({ providedIn: 'root' })
export class UnidadMedidaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/unidadesmedida`;

  search(params: SearchUnidadMedidaParams): Observable<PaginatedList<UnidadMedidaListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.codigo) {
      httpParams = httpParams.set('codigo', params.codigo);
    }
    if (params.descripcion) {
      httpParams = httpParams.set('descripcion', params.descripcion);
    }
    return this.http.get<PaginatedList<UnidadMedidaListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<UnidadMedidaDetail> {
    return this.http.get<UnidadMedidaDetail>(`${this.base}/${id}`);
  }

  create(body: CreateUnidadMedidaRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateUnidadMedidaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { codigo?: string; descripcion?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
