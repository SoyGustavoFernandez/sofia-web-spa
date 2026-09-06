import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  Empleado,
  CreateEmpleadoRequest,
  UpdateEmpleadoRequest,
  SearchEmpleadoParams,
} from '../models/empleado.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/empleados`;

  search(params: SearchEmpleadoParams): Observable<PaginatedList<Empleado>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombres) httpParams = httpParams.set('nombres', params.nombres);
    if (params.apellidoPaterno) httpParams = httpParams.set('apellidoPaterno', params.apellidoPaterno);
    if (params.apellidoMaterno) httpParams = httpParams.set('apellidoMaterno', params.apellidoMaterno);
    if (params.licencia) httpParams = httpParams.set('licencia', params.licencia);
    if (params.sucursalNombre) httpParams = httpParams.set('sucursalNombre', params.sucursalNombre);
    return this.http.get<PaginatedList<Empleado>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.base}/${id}`);
  }

  create(body: CreateEmpleadoRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateEmpleadoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(
    headers: string[],
    filters: {
      nombres?: string;
      apellidoPaterno?: string;
      apellidoMaterno?: string;
      licencia?: string;
      sucursalNombre?: string;
    },
  ): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
