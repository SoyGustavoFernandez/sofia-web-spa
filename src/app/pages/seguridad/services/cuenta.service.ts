import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { CuentaDto, SearchCuentaParams, CreateCuentaRequest, UpdateCuentaRequest, EmpleadoItem } from '../models/cuenta.model';
import { SucursalListItem } from '../../sucursales/models/sucursal.model';
import { PaginatedList } from '../../roles/models/rol.model';

@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/cuentas`;
  private readonly empleadosBase = `${environment.api.baseurl}/api/v1/empleados`;

  search(params: SearchCuentaParams): Observable<PaginatedList<CuentaDto>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.nombreUsuario) httpParams = httpParams.set('nombreUsuario', params.nombreUsuario);
    if (params.nombreEmpleado) httpParams = httpParams.set('nombreEmpleado', params.nombreEmpleado);
    if (params.cuentaActiva != null) httpParams = httpParams.set('cuentaActiva', params.cuentaActiva);
    if (params.bloqueado != null) httpParams = httpParams.set('bloqueado', params.bloqueado);
    return this.http.get<PaginatedList<CuentaDto>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<CuentaDto> {
    return this.http.get<CuentaDto>(`${this.base}/${id}`);
  }

  create(body: CreateCuentaRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, body);
  }

  update(id: string, body: UpdateCuentaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  searchEmpleados(searchTerm: string): Observable<{ items: EmpleadoItem[] }> {
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 20)
      .set('searchTerm', searchTerm);
    return this.http.get<{ items: EmpleadoItem[] }>(this.empleadosBase, { params });
  }

  assignRol(cuentaId: string, rolId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${cuentaId}/roles/${rolId}`, {});
  }

  removeRol(cuentaId: string, rolId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${cuentaId}/roles/${rolId}`);
  }

  assignSucursal(cuentaId: string, sucursalId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${cuentaId}/sucursales/${sucursalId}`, {});
  }

  removeSucursal(cuentaId: string, sucursalId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${cuentaId}/sucursales/${sucursalId}`);
  }

  searchSucursales(searchTerm: string): Observable<{ items: SucursalListItem[] }> {
    const sucursalesBase = `${environment.api.baseurl}/api/v1/sucursales`;
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 20)
      .set('nombre', searchTerm);
    return this.http.get<{ items: SucursalListItem[] }>(sucursalesBase, { params });
  }
}
