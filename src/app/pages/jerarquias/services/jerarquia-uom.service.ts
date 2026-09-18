import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  JerarquiaUoM,
  CreateJerarquiaUoMRequest,
  UpdateJerarquiaUoMRequest,
  SearchJerarquiaUoMParams,
  UnidadVendible,
} from '../models/jerarquia-uom.model';

@Injectable({ providedIn: 'root' })
export class JerarquiaUoMService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/jerarquiasuom`;

  search(params: SearchJerarquiaUoMParams): Observable<PaginatedList<JerarquiaUoM>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.productoNombre) httpParams = httpParams.set('productoNombre', params.productoNombre);
    if (params.unidadMayorNombre) httpParams = httpParams.set('unidadMayorNombre', params.unidadMayorNombre);
    if (params.unidadMenorNombre) httpParams = httpParams.set('unidadMenorNombre', params.unidadMenorNombre);
    if (params.multiplicadorMin !== undefined) httpParams = httpParams.set('multiplicadorMin', params.multiplicadorMin);
    if (params.multiplicadorMax !== undefined) httpParams = httpParams.set('multiplicadorMax', params.multiplicadorMax);
    return this.http.get<PaginatedList<JerarquiaUoM>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<JerarquiaUoM> {
    return this.http.get<JerarquiaUoM>(`${this.base}/${id}`);
  }

  getUnidadesVendibles(productoId: string): Observable<UnidadVendible[]> {
    return this.http.get<UnidadVendible[]>(`${this.base}/unidades-vendibles`, { params: { productoId } });
  }

  create(body: CreateJerarquiaUoMRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateJerarquiaUoMRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(
    headers: string[],
    filters: {
      productoNombre?: string;
      unidadMayorNombre?: string;
      unidadMenorNombre?: string;
      multiplicadorMin?: number;
      multiplicadorMax?: number;
    },
  ): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
