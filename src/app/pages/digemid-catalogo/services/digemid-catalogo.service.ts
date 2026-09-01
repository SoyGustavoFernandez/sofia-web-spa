import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  PaginatedList,
  DigemidCatalogoListItem,
  DigemidCatalogoDetail,
  SearchDigemidCatalogoParams,
} from '../models/digemid-catalogo.model';

@Injectable({ providedIn: 'root' })
export class DigemidCatalogoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/digemid/catalogo`;

  search(params: SearchDigemidCatalogoParams): Observable<PaginatedList<DigemidCatalogoListItem>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);
    if (params.codProd) {
      httpParams = httpParams.set('codProd', params.codProd);
    }
    if (params.nomProd) {
      httpParams = httpParams.set('nomProd', params.nomProd);
    }
    return this.http.get<PaginatedList<DigemidCatalogoListItem>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<DigemidCatalogoDetail> {
    return this.http.get<DigemidCatalogoDetail>(`${this.base}/${id}`);
  }

  exportar(headers: string[], filters: { codProd?: string; nomProd?: string }): Observable<Blob> {
    return this.http.post(`${this.base}/exportar`, { headers, ...filters }, { responseType: 'blob' });
  }
}
