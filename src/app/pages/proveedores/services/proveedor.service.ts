import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  ProveedorListItem,
  ProveedorDetail,
  CreateProveedorRequest,
  UpdateProveedorRequest,
  SearchProveedorParams,
} from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/proveedores`;

  search(params: SearchProveedorParams): Observable<PaginatedList<ProveedorListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.razonSocial) {
      httpParams = httpParams.set('razonSocial', params.razonSocial);
    }
    if (params.taxId) {
      httpParams = httpParams.set('taxId', params.taxId);
    }
    if (params.tasaCumplimientoDesde !== undefined) {
      httpParams = httpParams.set('tasaCumplimientoDesde', params.tasaCumplimientoDesde);
    }
    if (params.tasaCumplimientoHasta !== undefined) {
      httpParams = httpParams.set('tasaCumplimientoHasta', params.tasaCumplimientoHasta);
    }
    return this.http.get<PaginatedList<ProveedorListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<ProveedorDetail> {
    return this.http.get<ProveedorDetail>(`${this.base}/${id}`);
  }

  create(body: CreateProveedorRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateProveedorRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { razonSocial?: string; taxId?: string; tasaCumplimientoDesde?: number; tasaCumplimientoHasta?: number }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
