import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  FormulacionClinicaListItem,
  FormulacionClinicaDetail,
  CreateFormulacionClinicaRequest,
  UpdateFormulacionClinicaRequest,
  SearchFormulacionClinicaParams,
} from '../models/formulacion-clinica.model';

@Injectable({ providedIn: 'root' })
export class FormulacionClinicaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/formulacionesclinicas`;

  search(params: SearchFormulacionClinicaParams): Observable<PaginatedList<FormulacionClinicaListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.productoNombre) {
      httpParams = httpParams.set('productoNombre', params.productoNombre);
    }
    if (params.ingredienteNombre) {
      httpParams = httpParams.set('ingredienteNombre', params.ingredienteNombre);
    }
    return this.http.get<PaginatedList<FormulacionClinicaListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<FormulacionClinicaDetail> {
    return this.http.get<FormulacionClinicaDetail>(`${this.base}/${id}`);
  }

  create(body: CreateFormulacionClinicaRequest): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(id: string, body: UpdateFormulacionClinicaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
