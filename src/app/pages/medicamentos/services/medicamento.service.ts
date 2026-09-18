import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  MedicamentoListItem,
  MedicamentoDetail,
  CreateMedicamentoRequest,
  UpdateMedicamentoRequest,
  SearchMedicamentoParams,
} from '../models/medicamento.model';

@Injectable({ providedIn: 'root' })
export class MedicamentoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/medicamentos`;

  getCondicionesVenta(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/condiciones-venta`);
  }

  search(params: SearchMedicamentoParams): Observable<PaginatedList<MedicamentoListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.codigoNacional) httpParams = httpParams.set('codigoNacional', params.codigoNacional);
    if (params.nombreComercial) httpParams = httpParams.set('nombreComercial', params.nombreComercial);
    if (params.laboratorioNombre) httpParams = httpParams.set('laboratorioNombre', params.laboratorioNombre);
    if (params.unidadBaseNombre) httpParams = httpParams.set('unidadBaseNombre', params.unidadBaseNombre);
    if (params.condicionVenta !== undefined && params.condicionVenta !== null) {
      httpParams = httpParams.set('condicionVenta', params.condicionVenta);
    }
    if (params.incluirStock) httpParams = httpParams.set('incluirStock', params.incluirStock);
    if (params.ordenarPorMasVendidos) httpParams = httpParams.set('ordenarPorMasVendidos', params.ordenarPorMasVendidos);
    return this.http.get<PaginatedList<MedicamentoListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<MedicamentoDetail> {
    return this.http.get<MedicamentoDetail>(`${this.base}/${id}`);
  }

  create(body: CreateMedicamentoRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateMedicamentoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportar(
    headers: string[],
    filters: {
      codigoNacional?: string;
      nombreComercial?: string;
      laboratorioNombre?: string;
      unidadBaseNombre?: string;
      condicionVenta?: number;
    },
  ): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
