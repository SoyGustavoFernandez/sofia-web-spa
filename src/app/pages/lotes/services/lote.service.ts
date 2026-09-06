import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  Lote,
  CreateLoteRequest,
  UpdateLoteRequest,
  SearchLoteParams,
} from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/lotesinventario`;

  search(params: SearchLoteParams): Observable<PaginatedList<Lote>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.productoNombre) httpParams = httpParams.set('productoNombre', params.productoNombre);
    if (params.numeroLote) httpParams = httpParams.set('numeroLote', params.numeroLote);
    if (params.caducidadDesde) httpParams = httpParams.set('caducidadDesde', params.caducidadDesde);
    if (params.caducidadHasta) httpParams = httpParams.set('caducidadHasta', params.caducidadHasta);
    if (params.fabricacionDesde) httpParams = httpParams.set('fabricacionDesde', params.fabricacionDesde);
    if (params.fabricacionHasta) httpParams = httpParams.set('fabricacionHasta', params.fabricacionHasta);
    return this.http.get<PaginatedList<Lote>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<Lote> {
    return this.http.get<Lote>(`${this.base}/${id}`);
  }

  create(body: CreateLoteRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateLoteRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(
    headers: string[],
    dateFormat: string,
    filters: {
      productoNombre?: string;
      numeroLote?: string;
      caducidadDesde?: string;
      caducidadHasta?: string;
      fabricacionDesde?: string;
      fabricacionHasta?: string;
    },
  ): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, dateFormat, ...filters }, { responseType: 'blob' });
  }
}
