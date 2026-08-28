import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { Empresa, UpdateEmpresaRequest, RegistrarEmpresaRequest, RegistrarEmpresaResponse } from '../models/empresa.model';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/empresas`;

  getAll(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.base);
  }

  getById(id: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.base}/${id}`);
  }

  update(id: string, body: UpdateEmpresaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  register(body: RegistrarEmpresaRequest): Observable<RegistrarEmpresaResponse> {
    return this.http.post<RegistrarEmpresaResponse>(`${this.base}/registrar`, body);
  }
}
