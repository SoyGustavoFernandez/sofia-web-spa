import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  ProfesionalSaludListItem,
  ProfesionalSaludDetail,
  CreateProfesionalSaludRequest,
  UpdateProfesionalSaludRequest,
  SearchProfesionalSaludParams,
} from '../models/profesional-salud.model';

@Injectable({ providedIn: 'root' })
export class ProfesionalSaludService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/profesionalessalud`;

  search(params: SearchProfesionalSaludParams): Observable<PaginatedList<ProfesionalSaludListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.numeroRegistro) {
      httpParams = httpParams.set('numeroRegistro', params.numeroRegistro);
    }
    if (params.nombrePrescriptor) {
      httpParams = httpParams.set('nombrePrescriptor', params.nombrePrescriptor);
    }
    return this.http.get<PaginatedList<ProfesionalSaludListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<ProfesionalSaludDetail> {
    return this.http.get<ProfesionalSaludDetail>(`${this.base}/${id}`);
  }

  create(body: CreateProfesionalSaludRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateProfesionalSaludRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { numeroRegistro?: string; nombrePrescriptor?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
