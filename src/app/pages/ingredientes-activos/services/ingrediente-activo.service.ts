import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  IngredienteActivoListItem,
  IngredienteActivoDetail,
  CreateIngredienteActivoRequest,
  UpdateIngredienteActivoRequest,
  SearchIngredienteActivoParams,
} from '../models/ingrediente-activo.model';

@Injectable({ providedIn: 'root' })
export class IngredienteActivoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/ingredientesactivos`;

  search(params: SearchIngredienteActivoParams): Observable<PaginatedList<IngredienteActivoListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.denominacionDci) {
      httpParams = httpParams.set('denominacionDci', params.denominacionDci);
    }
    if (params.codigoAtc) {
      httpParams = httpParams.set('codigoAtc', params.codigoAtc);
    }
    return this.http.get<PaginatedList<IngredienteActivoListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<IngredienteActivoDetail> {
    return this.http.get<IngredienteActivoDetail>(`${this.base}/${id}`);
  }

  create(body: CreateIngredienteActivoRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateIngredienteActivoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { denominacionDci?: string; codigoAtc?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
