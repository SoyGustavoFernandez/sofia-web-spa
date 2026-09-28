import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  SerieFiscal,
  SaveSerieFiscalRequest,
  SearchSerieFiscalParams,
  SerieFiscalExportRequest,
} from '../models/serie-fiscal.model';

@Injectable({ providedIn: 'root' })
export class SerieFiscalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/seriesfiscales`;

  search(params: SearchSerieFiscalParams): Observable<PaginatedList<SerieFiscal>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.sucursalId) httpParams = httpParams.set('sucursalId', params.sucursalId);
    if (params.tipoComprobante != null) httpParams = httpParams.set('tipoComprobante', params.tipoComprobante);
    if (params.estadoSerie) httpParams = httpParams.set('estadoSerie', params.estadoSerie);
    if (params.prefijoSerie) httpParams = httpParams.set('prefijoSerie', params.prefijoSerie);
    return this.http.get<PaginatedList<SerieFiscal>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<SerieFiscal> {
    return this.http.get<SerieFiscal>(`${this.base}/${id}`);
  }

  create(body: SaveSerieFiscalRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: SaveSerieFiscalRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(request: SerieFiscalExportRequest): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, request, { responseType: 'blob' });
  }
}
