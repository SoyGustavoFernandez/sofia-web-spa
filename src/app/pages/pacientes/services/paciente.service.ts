import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  PacienteListItem,
  PacienteDetail,
  CreatePacienteRequest,
  UpdatePacienteRequest,
  SearchPacienteParams,
} from '../models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/pacientes`;

  search(params: SearchPacienteParams): Observable<PaginatedList<PacienteListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.docIdentidadGub) {
      httpParams = httpParams.set('docIdentidadGub', params.docIdentidadGub);
    }
    if (params.nombreApellidos) {
      httpParams = httpParams.set('nombreApellidos', params.nombreApellidos);
    }
    if (params.fechaNacimientoDesde) {
      httpParams = httpParams.set('fechaNacimientoDesde', params.fechaNacimientoDesde);
    }
    if (params.fechaNacimientoHasta) {
      httpParams = httpParams.set('fechaNacimientoHasta', params.fechaNacimientoHasta);
    }
    return this.http.get<PaginatedList<PacienteListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<PacienteDetail> {
    return this.http.get<PacienteDetail>(`${this.base}/${id}`);
  }

  create(body: CreatePacienteRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdatePacienteRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], dateFormat: string, filters: { docIdentidadGub?: string; nombreApellidos?: string; fechaNacimientoDesde?: string; fechaNacimientoHasta?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, dateFormat, ...filters }, { responseType: 'blob' });
  }
}
