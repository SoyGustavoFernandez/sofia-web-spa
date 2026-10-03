import { Component, OnInit, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { PermisoDirective } from '@shared/directives/permiso.directive';
import { toLocalDayStartIso } from '@shared/utils/date-only.util';
import { MetodoPago } from '../pos/models/venta.model';
import {
  DashboardCaja,
  DashboardCuarentena,
  DashboardDevoluciones,
  DashboardInventario,
  DashboardVentas,
  SesionAbierta,
} from './models/dashboard.model';
import { DashboardService } from './services/dashboard.service';
import {
  DashboardLink,
  inicioDelDia,
  lotesPorVencerLink,
  lotesVencidosLink,
  misVentasDeHoyLink,
  sesionesAbiertasLink,
  ventasDeHoyLink,
  ventasEnEsperaLink,
} from './dashboard-links';

// Each section keeps its last data while it reloads and fails on its own, so one error never blanks the rest
interface Seccion<T> {
  cargando: boolean;
  error: boolean;
  datos: T | null;
}

interface BarraDia {
  desde: string;
  monto: number;
  comprobantes: number;
  altura: number;
  esHoy: boolean;
}

interface FilaMetodo {
  metodo: MetodoPago;
  monto: number;
  proporcion: number;
}

interface FilaTop {
  productoId: string;
  nombre: string;
  unidades: number;
  monto: number;
  proporcion: number;
}

const SECCION_VACIA = { cargando: false, error: false, datos: null };

// Share of a value against a reference, safe when the reference is zero
function porcentaje(valor: number, referencia: number): number {
  return referencia > 0 ? Math.round((valor / referencia) * 1000) / 10 : 0;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [provideTranslocoScope('dashboard')],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    TranslocoModule,
    PermisoDirective,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly searchState = inject(SearchStateService);

  readonly MetodoPago = MetodoPago;
  readonly columnasSucursal = ['nombre', 'comprobantes', 'monto'];
  readonly columnasSesion = ['empleadoNombre', 'sucursalNombre', 'fechaHoraApertura'];

  readonly ventas = signal<Seccion<DashboardVentas>>(SECCION_VACIA);
  readonly caja = signal<Seccion<DashboardCaja>>(SECCION_VACIA);
  readonly inventario = signal<Seccion<DashboardInventario>>(SECCION_VACIA);
  readonly cuarentena = signal<Seccion<DashboardCuarentena>>(SECCION_VACIA);
  readonly devoluciones = signal<Seccion<DashboardDevoluciones>>(SECCION_VACIA);

  readonly permisosCargando = signal(true);
  readonly permisosError = signal(false);
  readonly actualizado = signal<Date | null>(null);
  // Start of the local day the figures on screen were requested for
  readonly hoy = signal<Date>(inicioDelDia(new Date()));

  readonly nombreUsuario = computed(() => this.auth.currentUser()?.fullName ?? '');

  // The route has no permission module, so each section is gated by the module its figures come from
  readonly puedeVentas = computed(() => this.auth.hasPermission('Ventas'));
  readonly puedeCaja = computed(() => this.auth.hasPermission('POS'));
  readonly puedeInventario = computed(() => this.auth.hasPermission('Inventarios'));
  readonly puedeCuarentena = computed(() => this.auth.hasPermission('DIGEMID'));
  readonly puedeDevoluciones = computed(() => this.auth.hasPermission('Devoluciones'));
  readonly sinSecciones = computed(
    () =>
      !this.permisosCargando() &&
      !this.permisosError() &&
      !this.puedeVentas() &&
      !this.puedeCaja() &&
      !this.puedeInventario() &&
      !this.puedeCuarentena() &&
      !this.puedeDevoluciones(),
  );

  readonly cargando = computed(
    () =>
      this.permisosCargando() ||
      this.ventas().cargando ||
      this.caja().cargando ||
      this.inventario().cargando ||
      this.cuarentena().cargando ||
      this.devoluciones().cargando,
  );

  // Sales lists only cover the user's own branch, so their links are offered in the single-branch view only
  readonly enlacesDeVentas = computed(() => this.ventas().datos?.multiSucursal === false);
  readonly empleadoId = computed(() => this.auth.empleadoId());

  // Change against yesterday as a percentage; null when yesterday sold nothing, where a percentage means nothing
  readonly variacionAyer = computed<number | null>(() => {
    const datos = this.ventas().datos;
    if (!datos || datos.ayer.monto <= 0) return null;
    return Math.round(((datos.hoy.monto - datos.ayer.monto) / datos.ayer.monto) * 1000) / 10;
  });

  readonly metodos = computed<FilaMetodo[]>(() => {
    const filas = this.ventas().datos?.porMetodoPago ?? [];
    const total = filas.reduce((suma, fila) => suma + fila.monto, 0);
    return filas.map(fila => ({ ...fila, proporcion: porcentaje(fila.monto, total) }));
  });

  readonly barras = computed<BarraDia[]>(() => {
    const dias = this.ventas().datos?.tendencia7Dias ?? [];
    const maximo = Math.max(0, ...dias.map(dia => dia.monto));
    return dias.map((dia, indice) => ({
      ...dia,
      altura: porcentaje(dia.monto, maximo),
      esHoy: indice === dias.length - 1,
    }));
  });

  readonly top = computed<FilaTop[]>(() => {
    const productos = this.ventas().datos?.topProductos ?? [];
    const maximo = Math.max(0, ...productos.map(producto => producto.unidades));
    return productos.map(producto => ({ ...producto, proporcion: porcentaje(producto.unidades, maximo) }));
  });

  // Listed only when the scope holds more drawers than the user's own
  readonly otrasSesiones = computed<SesionAbierta[]>(() => {
    const datos = this.caja().datos;
    if (!datos) return [];
    const propia = datos.miSesion?.id;
    return datos.sesionesAbiertas.some(sesion => sesion.id !== propia) ? datos.sesionesAbiertas : [];
  });

  ngOnInit(): void {
    this.cargarPermisos();
  }

  // Permissions come first: a section the user cannot read is neither requested nor rendered
  cargarPermisos(): void {
    this.permisosCargando.set(true);
    this.permisosError.set(false);
    this.auth.loadPermissions().subscribe({
      next: () => {
        this.permisosCargando.set(false);
        this.actualizar();
      },
      error: () => {
        this.permisosCargando.set(false);
        this.permisosError.set(true);
      },
    });
  }

  actualizar(): void {
    this.hoy.set(inicioDelDia(new Date()));
    this.actualizado.set(new Date());
    this.cargarVentas();
    this.cargarCaja();
    this.cargarInventario();
    this.cargarCuarentena();
    this.cargarDevoluciones();
  }

  cargarVentas(): void {
    this.cargar(this.puedeVentas, this.ventas, () => this.service.ventas(this.hoyIso()));
  }

  cargarCaja(): void {
    this.cargar(this.puedeCaja, this.caja, () => this.service.caja());
  }

  cargarInventario(): void {
    this.cargar(this.puedeInventario, this.inventario, () => this.service.inventario(this.hoyIso()));
  }

  cargarCuarentena(): void {
    this.cargar(this.puedeCuarentena, this.cuarentena, () => this.service.cuarentena());
  }

  cargarDevoluciones(): void {
    this.cargar(this.puedeDevoluciones, this.devoluciones, () => this.service.devoluciones(this.hoyIso()));
  }

  // Saves the filters the target search restores and runs on load, then opens it
  abrir(link: DashboardLink): void {
    this.searchState.save(link.path, link.state);
    void this.router.navigate([link.path]);
  }

  ventasDeHoy(): DashboardLink {
    return ventasDeHoyLink(this.hoy());
  }

  misVentasDeHoy(empleadoId: string): DashboardLink {
    return misVentasDeHoyLink(this.hoy(), empleadoId, this.nombreUsuario());
  }

  ventasEnEspera(): DashboardLink {
    return ventasEnEsperaLink();
  }

  sesionesAbiertas(): DashboardLink {
    return sesionesAbiertasLink();
  }

  lotesVencidos(): DashboardLink {
    return lotesVencidosLink(this.hoy());
  }

  lotesPorVencer(desdeDias: number, hastaDias: number): DashboardLink {
    return lotesPorVencerLink(this.hoy(), desdeDias, hastaDias);
  }

  private hoyIso(): string {
    return toLocalDayStartIso(this.hoy()) ?? '';
  }

  private cargar<T>(permitido: Signal<boolean>, seccion: WritableSignal<Seccion<T>>, pedir: () => Observable<T>): void {
    if (!permitido()) return;
    seccion.update(actual => ({ ...actual, cargando: true, error: false }));
    pedir().subscribe({
      next: datos => seccion.set({ cargando: false, error: false, datos }),
      error: () => seccion.update(actual => ({ ...actual, cargando: false, error: true })),
    });
  }
}
