import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  RecetaListItem,
  RecetaDetail,
  CreateRecetaRequest,
  UpdateRecetaRequest,
  SearchRecetaParams,
  RecetaExportRequest,
  ItemSugerido,
} from '../models/receta-medica.model';

@Injectable({ providedIn: 'root' })
export class RecetaMedicaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/recetas`;

  search(params: SearchRecetaParams): Observable<PaginatedList<RecetaListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.clienteId) httpParams = httpParams.set('clienteId', params.clienteId);
    if (params.medicoId) httpParams = httpParams.set('medicoId', params.medicoId);
    if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
    return this.http.get<PaginatedList<RecetaListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<RecetaDetail> {
    return this.http.get<RecetaDetail>(`${this.base}/${id}`);
  }

  create(body: CreateRecetaRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateRecetaRequest): Observable<string> {
    return this.http.put<string>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(request: RecetaExportRequest): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, request, { responseType: 'blob' });
  }

  analizar(imagen: File, especialidadContexto?: string): Observable<ItemSugerido[]> {
    const formData = new FormData();
    formData.append('imagen', imagen);
    let params = new HttpParams();
    if (especialidadContexto) params = params.set('especialidadContexto', especialidadContexto);
    return this.http.post<ItemSugerido[]>(`${this.base}/analizar`, formData, { params });
  }
}
