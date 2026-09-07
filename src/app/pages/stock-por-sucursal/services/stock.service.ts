import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { PaginatedList, StockPorSucursal, SearchStockParams, StockFilters, CreateStockRequest } from '../models/stock.model';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/stockporsucursal`;

  search(params: SearchStockParams): Observable<PaginatedList<StockPorSucursal>> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize)
      .set('soloConStock', params.soloConStock ?? true);
    if (params.sucursalNombre) httpParams = httpParams.set('sucursalNombre', params.sucursalNombre);
    if (params.productoNombre) httpParams = httpParams.set('productoNombre', params.productoNombre);
    if (params.numeroLote) httpParams = httpParams.set('numeroLote', params.numeroLote);
    if (params.caducidadDesde) httpParams = httpParams.set('caducidadDesde', params.caducidadDesde);
    if (params.caducidadHasta) httpParams = httpParams.set('caducidadHasta', params.caducidadHasta);
    if (params.cantidadMin !== undefined) httpParams = httpParams.set('cantidadMin', params.cantidadMin);
    if (params.cantidadMax !== undefined) httpParams = httpParams.set('cantidadMax', params.cantidadMax);
    return this.http.get<PaginatedList<StockPorSucursal>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<StockPorSucursal> {
    return this.http.get<StockPorSucursal>(`${this.base}/${id}`);
  }

  registrar(body: CreateStockRequest): Observable<string> {
    return this.http.post<string>(`${environment.api.baseurl}/api/v1/lotesinventario/stock`, body);
  }

  ajustar(id: string, nuevaCantidad: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/ajustar`, { nuevaCantidad });
  }

  exportar(headers: string[], dateFormat: string, filters: StockFilters): Observable<Blob> {
    return this.http.post(
      `${this.base}/exportar`,
      { headers, dateFormat, ...filters },
      { responseType: 'blob' },
    );
  }
}
