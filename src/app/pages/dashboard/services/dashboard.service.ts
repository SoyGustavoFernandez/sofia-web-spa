import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import {
  DashboardCaja,
  DashboardCuarentena,
  DashboardDevoluciones,
  DashboardInventario,
  DashboardVentas,
} from '../models/dashboard.model';

// One endpoint per permission module; hoy is the instant where the user's local day starts
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.api.baseurl}/api/v1/dashboard`;

  ventas(hoy: string): Observable<DashboardVentas> {
    return this.http.get<DashboardVentas>(`${this.base}/ventas`, { params: new HttpParams().set('hoy', hoy) });
  }

  caja(): Observable<DashboardCaja> {
    return this.http.get<DashboardCaja>(`${this.base}/caja`);
  }

  inventario(hoy: string): Observable<DashboardInventario> {
    return this.http.get<DashboardInventario>(`${this.base}/inventario`, { params: new HttpParams().set('hoy', hoy) });
  }

  cuarentena(): Observable<DashboardCuarentena> {
    return this.http.get<DashboardCuarentena>(`${this.base}/cuarentena`);
  }

  devoluciones(hoy: string): Observable<DashboardDevoluciones> {
    return this.http.get<DashboardDevoluciones>(`${this.base}/devoluciones`, { params: new HttpParams().set('hoy', hoy) });
  }
}
