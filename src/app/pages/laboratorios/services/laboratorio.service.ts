import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  LaboratorioListItem,
  LaboratorioDetail,
  CreateLaboratorioRequest,
  UpdateLaboratorioRequest,
  SearchLaboratorioParams,
} from '../models/laboratorio.model';

@Injectable({ providedIn: 'root' })
export class LaboratorioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/laboratorios`;

  search(params: SearchLaboratorioParams): Observable<PaginatedList<LaboratorioListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombreCompania) {
      httpParams = httpParams.set('nombreCompania', params.nombreCompania);
    }
    if (params.codigoIdentificador) {
      httpParams = httpParams.set('codigoIdentificador', params.codigoIdentificador);
    }
    return this.http.get<PaginatedList<LaboratorioListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<LaboratorioDetail> {
    return this.http.get<LaboratorioDetail>(`${this.base}/${id}`);
  }

  create(body: CreateLaboratorioRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateLaboratorioRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { nombreCompania?: string; codigoIdentificador?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
