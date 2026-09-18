import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  PresentacionVenta,
  CreatePresentacionVentaRequest,
  UpdatePresentacionVentaRequest,
  SearchPresentacionVentaParams,
} from '../models/presentacion-venta.model';

@Injectable({ providedIn: 'root' })
export class PresentacionVentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/presentacionesventa`;

  search(params: SearchPresentacionVentaParams): Observable<PaginatedList<PresentacionVenta>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.productoId) httpParams = httpParams.set('productoId', params.productoId);
    if (params.productoNombre) httpParams = httpParams.set('productoNombre', params.productoNombre);
    if (params.descripcion) httpParams = httpParams.set('descripcion', params.descripcion);
    return this.http.get<PaginatedList<PresentacionVenta>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<PresentacionVenta> {
    return this.http.get<PresentacionVenta>(`${this.base}/${id}`);
  }

  create(body: CreatePresentacionVentaRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdatePresentacionVentaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { productoNombre?: string; descripcion?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
