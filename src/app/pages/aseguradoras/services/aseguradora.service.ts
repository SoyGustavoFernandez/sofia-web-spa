import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  AseguradoraListItem,
  AseguradoraDetail,
  CreateAseguradoraRequest,
  UpdateAseguradoraRequest,
  SearchAseguradoraParams,
} from '../models/aseguradora.model';

@Injectable({ providedIn: 'root' })
export class AseguradoraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/seguros`;

  search(params: SearchAseguradoraParams): Observable<PaginatedList<AseguradoraListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombreComercial) {
      httpParams = httpParams.set('nombreComercial', params.nombreComercial);
    }
    if (params.codigoIdentificadorNacional) {
      httpParams = httpParams.set('codigoIdentificadorNacional', params.codigoIdentificadorNacional);
    }
    return this.http.get<PaginatedList<AseguradoraListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<AseguradoraDetail> {
    return this.http.get<AseguradoraDetail>(`${this.base}/${id}`);
  }

  create(body: CreateAseguradoraRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateAseguradoraRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { nombreComercial?: string; codigoIdentificadorNacional?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
