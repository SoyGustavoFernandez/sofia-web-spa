import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  SucursalListItem,
  SucursalDetail,
  CreateSucursalRequest,
  UpdateSucursalRequest,
  SearchSucursalParams,
  EmpleadoItem,
} from '../models/sucursal.model';

@Injectable({ providedIn: 'root' })
export class SucursalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/sucursales`;
  private readonly empleadosBase = `${environment.api.baseurl}/api/v1/empleados`;

  search(params: SearchSucursalParams): Observable<PaginatedList<SucursalListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params.numeroLicencia) httpParams = httpParams.set('numeroLicencia', params.numeroLicencia);
    if (params.direccionFisica) httpParams = httpParams.set('direccionFisica', params.direccionFisica);
    return this.http.get<PaginatedList<SucursalListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<SucursalDetail> {
    return this.http.get<SucursalDetail>(`${this.base}/${id}`);
  }

  create(body: CreateSucursalRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateSucursalRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(
    headers: string[],
    filters: { nombre?: string; numeroLicencia?: string; direccionFisica?: string }
  ): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }

  searchEmpleados(searchTerm: string): Observable<PaginatedList<EmpleadoItem>> {
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 20)
      .set('searchTerm', searchTerm);
    return this.http.get<PaginatedList<EmpleadoItem>>(this.empleadosBase, { params });
  }
}
