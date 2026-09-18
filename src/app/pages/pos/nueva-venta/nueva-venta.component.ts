import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { AuthService } from '@core/auth/auth.service';
import { VentaService } from '../services/venta.service';
import { CreateVentaRequest, CreateVentaDetalleRequest, MetodoPago, EstadoVenta } from '../models/venta.model';
import { SesionCajaService } from '../../sesiones-caja/services/sesion-caja.service';
import { EstadoSesion } from '../../sesiones-caja/models/sesion-caja.model';
import { MedicamentoService } from '../../medicamentos/services/medicamento.service';
import { MedicamentoListItem } from '../../medicamentos/models/medicamento.model';
import { StockService } from '../../stock-por-sucursal/services/stock.service';
import { StockPorSucursal } from '../../stock-por-sucursal/models/stock.model';
import { PresentacionVentaService } from '../../presentaciones-venta/services/presentacion-venta.service';
import { PresentacionVenta } from '../../presentaciones-venta/models/presentacion-venta.model';
import { PacienteService } from '../../pacientes/services/paciente.service';
import { PacienteListItem } from '../../pacientes/models/paciente.model';
import { AseguradoraService } from '../../aseguradoras/services/aseguradora.service';
import { AseguradoraListItem } from '../../aseguradoras/models/aseguradora.model';
import { RecetaMedicaService } from '../../recetas-medicas/services/receta-medica.service';
import { ItemSugerido } from '../../recetas-medicas/models/receta-medica.model';
import { ConfirmarVentaDialogComponent, ConfirmarVentaDialogData } from '../dialogs/confirmar-venta-dialog/confirmar-venta-dialog.component';
import { ComprobanteDialogComponent, ComprobanteDialogData } from '../dialogs/comprobante-dialog/comprobante-dialog.component';
import { AperturarCajaDialogComponent } from '../dialogs/aperturar-caja-dialog/aperturar-caja-dialog.component';

interface CartLine {
  loteId: string;
  productoNombre: string;
  numeroLote: string;
  cantidadDisponible: number;
  cantidad: number;
  precioUnitario: number;
  presentacionVentaId?: string;
  presentacionDescripcion?: string;
  cantidadEnPresentacion?: number;
  presentacionCantidadUnidadesBase?: number;
}

interface PagoLine {
  metodoPago: MetodoPago;
  monto: number;
  referencia: string;
}

type CatalogTab = 'buscar' | 'receta';

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  templateUrl: './nueva-venta.component.html',
  styleUrl: './nueva-venta.component.scss',
  providers: [provideTranslocoScope('pos'), provideTranslocoScope('recetas-medicas')],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class NuevaVentaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly stockService = inject(StockService);
  private readonly presentacionVentaService = inject(PresentacionVentaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly aseguradoraService = inject(AseguradoraService);
  private readonly ventaService = inject(VentaService);
  private readonly recetaMedicaService = inject(RecetaMedicaService);

  readonly MetodoPago = MetodoPago;
  readonly metodoPagoOpciones = [MetodoPago.Efectivo, MetodoPago.YapePlin, MetodoPago.Tarjeta, MetodoPago.Transferencia];

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.puntoVenta' },
    { label: 'breadcrumbs.ventas', route: '/pos' },
  ];

  readonly checkingSesion = signal(true);
  readonly sesionId = signal<string | null>(null);
  readonly procesando = signal(false);
  readonly guardandoPendiente = signal(false);
  readonly continuandoVentaId = signal<string | null>(null);
  readonly cargandoContinuacion = signal(false);
  private get draftKey(): string {
    const continuandoId = this.continuandoVentaId();
    return continuandoId ? `pos-nueva-venta-draft-${continuandoId}` : 'pos-nueva-venta-draft';
  }

  // ── Column A: catalog tabs ────────────────────────────
  readonly activeTab = signal<CatalogTab>('buscar');

  readonly catalogoForm = this.fb.group({ productoNombre: [''] });
  readonly medicamentoOptions = signal<MedicamentoListItem[]>([]);
  readonly condicionLabels = signal<string[]>([]);
  readonly condicionFiltro = signal<number | null>(null);
  private readonly buscarProductos$ = new Subject<string>();
  readonly selectedMedicamentoId = signal<string | null>(null);
  readonly loteOptions = signal<StockPorSucursal[]>([]);
  readonly selectedLote = signal<StockPorSucursal | null>(null);
  readonly addForm = this.fb.group({ cantidad: [1], precio: [0] });
  readonly presentacionOptions = signal<PresentacionVenta[]>([]);
  // '' (not null) marks "unidad base": mat-select's option-matching skips options whose value is null/undefined,
  // so a mat-option [value]="null" can never render as the selected trigger text.
  readonly selectedPresentacionId = signal<string>('');
  readonly selectedPresentacion = computed(
    () => this.presentacionOptions().find(p => p.id === this.selectedPresentacionId()) ?? null,
  );

  // Scan prescription
  readonly recetaImagen = signal<File | null>(null);
  readonly recetaPreview = signal<string | null>(null);
  readonly recetaLoading = signal(false);
  readonly recetaDragging = signal(false);
  readonly itemsDetectados = signal<ItemSugerido[] | null>(null);
  readonly itemsAgregadosNombres = signal<Set<string>>(new Set());

  readonly cart = signal<CartLine[]>([]);

  readonly clienteForm = this.fb.group({ clienteNombre: [''] });
  readonly clienteOptions = signal<PacienteListItem[]>([]);
  readonly selectedCliente = signal<PacienteListItem | null>(null);

  // Insurance coverage is built but hidden from the UI until the pharmacy starts working with aseguradoras.
  readonly mostrarAseguradora = false;
  readonly seguroExpanded = signal(false);
  readonly seguroForm = this.fb.group({ aseguradoraNombre: [''], montoCubierto: [null as number | null] });
  readonly aseguradoraOptions = signal<AseguradoraListItem[]>([]);
  readonly selectedAseguradora = signal<AseguradoraListItem | null>(null);

  readonly pagos = signal<PagoLine[]>([{ metodoPago: MetodoPago.Efectivo, monto: 0, referencia: '' }]);
  readonly modoPagoAvanzado = signal(false);
  readonly metodoPagoSimpleSeleccionado = computed(() => (this.pagos().length === 1 ? this.pagos()[0].metodoPago : null));

  readonly subtotalBruto = computed(() => this.cart().reduce((s, l) => s + l.cantidad * l.precioUnitario, 0));
  readonly montoCubiertoSeguro = computed(() => this.seguroForm.value.montoCubierto ?? 0);
  readonly montoAPagar = computed(() => this.subtotalBruto() - this.montoCubiertoSeguro());
  readonly totalPagado = computed(() => this.pagos().reduce((s, p) => s + (p.monto || 0), 0));
  readonly montoPendiente = computed(() => this.montoAPagar() - this.totalPagado());
  readonly tieneEfectivo = computed(() => this.pagos().some(p => p.metodoPago === MetodoPago.Efectivo));
  readonly subtotalSinIgv = computed(() => this.subtotalBruto() / 1.18);
  readonly igv = computed(() => this.subtotalBruto() - this.subtotalSinIgv());
  readonly cambioAEntregar = computed(() => Math.max(0, -this.montoPendiente()));

  readonly puedeProcesar = computed(() => {
    const pendiente = this.montoPendiente();
    const cubierto = pendiente === 0 || (pendiente < 0 && this.tieneEfectivo());
    return this.cart().length > 0 && !!this.sesionId() && cubierto && !this.procesando();
  });

  readonly puedeGuardarPendiente = computed(
    () => this.cart().length > 0 && !!this.sesionId() && !this.procesando() && !this.guardandoPendiente(),
  );

  get itemsReceta(): ItemSugerido[] {
    return this.itemsDetectados()?.filter(i => i.tipoSugerencia === 'Receta') ?? [];
  }

  get itemsSugerencia(): ItemSugerido[] {
    return this.itemsDetectados()?.filter(i => i.tipoSugerencia === 'Recomendacion') ?? [];
  }

  constructor() {
    this.buscarProductos$
      .pipe(
        debounceTime(300),
        switchMap(term =>
          this.medicamentoService.search({
            nombreComercial: term || undefined,
            condicionVenta: this.condicionFiltro() ?? undefined,
            incluirStock: true,
            // Only rank by sales when the cashier hasn't narrowed the catalog down themselves.
            ordenarPorMasVendidos: !term && this.condicionFiltro() === null,
            pageNumber: 1,
            pageSize: 12,
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.medicamentoOptions.set(result.items));

    this.catalogoForm.controls.productoNombre.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(term => this.buscarProductos$.next(typeof term === 'string' ? term : ''));

    this.clienteForm.controls.clienteNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as PacienteListItem[] });
          this.selectedCliente.set(null);
          const esDocumento = /^\d+$/.test(term.trim());
          return esDocumento
            ? this.pacienteService.search({ docIdentidadGub: term.trim(), pageNumber: 1, pageSize: 20 })
            : this.pacienteService.search({ nombreApellidos: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.clienteOptions.set(result.items));

    this.seguroForm.controls.aseguradoraNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          if (!term || typeof term !== 'string') return of({ items: [] as AseguradoraListItem[] });
          this.selectedAseguradora.set(null);
          return this.aseguradoraService.search({ nombreComercial: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.aseguradoraOptions.set(result.items));

    this.seguroForm.controls.montoCubierto.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saveDraft());

    effect(() => this.saveDraft());
  }

  ngOnInit(): void {
    const continuarId = this.route.snapshot.queryParamMap.get('continuar');
    if (continuarId) {
      this.cargarVentaPendiente(continuarId);
    } else {
      this.restoreDraft();
    }

    this.checkSesionCaja();
    this.medicamentoService.getCondicionesVenta().subscribe(labels => this.condicionLabels.set(labels));
    this.buscarProductos$.next('');
  }

  private checkSesionCaja(): void {
    const sucursalId = this.authService.sucursalId();
    if (!sucursalId) {
      this.checkingSesion.set(false);
      return;
    }
    this.checkingSesion.set(true);
    this.sesionCajaService.search({ sucursalId, estadoSesion: EstadoSesion.Abierta, pageNumber: 1, pageSize: 1 }).subscribe({
      next: result => {
        this.sesionId.set(result.items[0]?.id ?? null);
        this.checkingSesion.set(false);
      },
      error: () => this.checkingSesion.set(false),
    });
  }

  abrirCaja(): void {
    const ref = this.dialog.open(AperturarCajaDialogComponent, { width: '450px' });
    ref.afterClosed().subscribe((success: boolean | undefined) => {
      if (success) {
        this.checkSesionCaja();
      }
    });
  }

  private cargarVentaPendiente(ventaId: string): void {
    this.continuandoVentaId.set(ventaId);
    this.cargandoContinuacion.set(true);

    this.ventaService.getById(ventaId).subscribe({
      next: venta => {
        if (venta.estado !== 'Pendiente') {
          this.notifier.showError(this.transloco.translate('pos.messages.ventaYaNoPendiente'));
          this.cargandoContinuacion.set(false);
          this.continuandoVentaId.set(null);
          this.router.navigate(['/pos', ventaId]);
          return;
        }

        const sucursalId = this.authService.sucursalId();
        const stockLookups = venta.detalles.map(d =>
          this.stockService.search({ productoNombre: d.productoNombre, soloConStock: false, pageNumber: 1, pageSize: 50 }),
        );

        (stockLookups.length > 0 ? forkJoin(stockLookups) : of([])).subscribe(resultados => {
          const cart: CartLine[] = venta.detalles.map((d, i) => {
            const lote = resultados[i]?.items.find(l => l.loteId === d.loteId && l.sucursalId === sucursalId);
            const tienePresentacion = !!d.presentacionVentaId && !!d.cantidadEnPresentacion;
            return {
              loteId: d.loteId,
              productoNombre: d.productoNombre,
              numeroLote: d.numeroLote,
              cantidadDisponible: (lote?.cantidadFisica ?? 0) + d.cantidad,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              presentacionVentaId: d.presentacionVentaId ?? undefined,
              presentacionDescripcion: d.presentacionDescripcion ?? undefined,
              cantidadEnPresentacion: d.cantidadEnPresentacion ?? undefined,
              presentacionCantidadUnidadesBase: tienePresentacion ? d.cantidad / d.cantidadEnPresentacion! : undefined,
            };
          });
          this.cart.set(cart);

          if (venta.clienteId) {
            const cliente: PacienteListItem = {
              id: venta.clienteId,
              docIdentidadGub: venta.clienteDocumento ?? '',
              nombreApellidos: venta.clienteNombre ?? '',
              fechaNacimiento: '',
              contactoPrimario: null,
            };
            this.selectedCliente.set(cliente);
            this.clienteForm.controls.clienteNombre.setValue(cliente as unknown as string, { emitEvent: false });
          }

          this.restorePagosDraft();
          this.cargandoContinuacion.set(false);
        });
      },
      error: () => {
        this.notifier.showError(this.transloco.translate('pos.ventasDetail.loadError'));
        this.cargandoContinuacion.set(false);
        this.continuandoVentaId.set(null);
      },
    });
  }

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
  }

  private saveDraft(): void {
    // Skip while a pending sale's server data is still loading: cart/pagos are momentarily
    // empty/default at that point, and saving would wipe the per-venta draft before it's read.
    if (this.cargandoContinuacion()) return;
    const draft = {
      cart: this.cart(),
      pagos: this.pagos(),
      cliente: this.selectedCliente(),
      aseguradora: this.selectedAseguradora(),
      montoCubierto: this.seguroForm.value.montoCubierto,
      seguroExpanded: this.seguroExpanded(),
    };
    if (draft.cart.length === 0 && !draft.cliente && !draft.aseguradora) {
      localStorage.removeItem(this.draftKey);
      return;
    }
    localStorage.setItem(this.draftKey, JSON.stringify(draft));
  }

  private restoreDraft(): void {
    const raw = localStorage.getItem(this.draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (Array.isArray(draft.cart) && draft.cart.length > 0) this.cart.set(draft.cart);
      if (Array.isArray(draft.pagos) && draft.pagos.length > 0) {
        this.pagos.set(draft.pagos);
        if (draft.pagos.length > 1) this.modoPagoAvanzado.set(true);
      }
      if (draft.cliente) {
        this.selectedCliente.set(draft.cliente);
        this.clienteForm.controls.clienteNombre.setValue(draft.cliente, { emitEvent: false });
      }
      if (draft.aseguradora) {
        this.selectedAseguradora.set(draft.aseguradora);
        this.seguroForm.controls.aseguradoraNombre.setValue(draft.aseguradora, { emitEvent: false });
      }
      if (draft.montoCubierto != null) {
        this.seguroForm.controls.montoCubierto.setValue(draft.montoCubierto, { emitEvent: false });
      }
      if (draft.seguroExpanded) this.seguroExpanded.set(true);
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  // A brand-new sale drafts under the generic key (it has no ventaId yet); once held as Pendiente,
  // relocate any in-progress payment rows to the venta's own key before resetVenta() wipes the generic one.
  private persistPagosDraftForVenta(ventaId: string): void {
    const pagos = this.pagos();
    if (!pagos.some(p => p.monto > 0)) return;
    localStorage.setItem(`pos-nueva-venta-draft-${ventaId}`, JSON.stringify({ cart: [], pagos, cliente: null, aseguradora: null, montoCubierto: null, seguroExpanded: false }));
  }

  // Restores only the payment rows the cashier had typed for a pending sale before navigating away,
  // since a Pendiente venta never persists VentaPago rows server-side until it's actually completed.
  private restorePagosDraft(): void {
    const raw = localStorage.getItem(this.draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (Array.isArray(draft.pagos) && draft.pagos.length > 0) {
        this.pagos.set(draft.pagos);
        if (draft.pagos.length > 1) this.modoPagoAvanzado.set(true);
      }
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  // ── Search product ─────────────────────────────────────
  setCondicionFiltro(value: number | null): void {
    this.condicionFiltro.set(value);
    const term = this.catalogoForm.value.productoNombre;
    this.buscarProductos$.next(typeof term === 'string' ? term : '');
  }

  stockBadgeClass(stockTotal: number | null): 'ok' | 'low' | 'bad' {
    if (!stockTotal) return 'bad';
    return stockTotal <= 10 ? 'low' : 'ok';
  }

  stockBadgeLabel(stockTotal: number | null): string {
    const t = (k: string): string => this.transloco.translate(k, {}, 'pos');
    if (!stockTotal) return t('checkout.stockAgotado');
    return stockTotal <= 10 ? t('checkout.stockBajo') : t('checkout.stockDisponible');
  }

  selectMedicamento(medicamento: MedicamentoListItem): void {
    if (!medicamento.stockTotal) return;
    this.selectedMedicamentoId.set(medicamento.id);
    const sucursalId = this.authService.sucursalId();
    this.stockService.search({ productoNombre: medicamento.nombreComercial, soloConStock: true, pageNumber: 1, pageSize: 50 }).subscribe({
      next: result => this.loteOptions.set(result.items.filter(l => l.sucursalId === sucursalId)),
      error: () => this.loteOptions.set([]),
    });
  }

  selectLote(lote: StockPorSucursal): void {
    this.selectedLote.set(lote);
    this.addForm.setValue({ cantidad: 1, precio: lote.precioVentaBase ?? 0 });
    this.presentacionOptions.set([]);
    this.selectedPresentacionId.set('');
    this.presentacionVentaService.search({ productoId: lote.productoId, pageNumber: 1, pageSize: 50 }).subscribe({
      next: result => this.presentacionOptions.set(result.items),
      error: () => this.presentacionOptions.set([]),
    });
  }

  floorDiv(a: number, b: number): number {
    return b > 0 ? Math.floor(a / b) : 0;
  }

  onPresentacionChange(presentacionId: string): void {
    this.selectedPresentacionId.set(presentacionId);
    const presentacion = this.presentacionOptions().find(p => p.id === presentacionId);
    const precioBase = this.selectedLote()?.precioVentaBase ?? 0;
    this.addForm.patchValue({ cantidad: 1, precio: presentacion ? presentacion.precioVenta : precioBase });
  }

  agregarAlCarrito(): void {
    const lote = this.selectedLote();
    if (!lote) {
      return;
    }
    const cantidadIngresada = Number(this.addForm.value.cantidad);
    const precioIngresado = Number(this.addForm.value.precio);
    const presentacion = this.selectedPresentacion();

    // Cantidad/precio are entered in the chosen presentación's own units (e.g. "Cajas x10" at S/45/caja);
    // the cart — and the backend — always work in base units, so convert before any stock/cart math.
    const cantidadBase = presentacion ? cantidadIngresada * presentacion.cantidadUnidadesBase : cantidadIngresada;
    const precioUnitarioBase = presentacion ? precioIngresado / presentacion.cantidadUnidadesBase : precioIngresado;

    if (cantidadBase > lote.cantidadFisica) {
      this.notifier.showError(this.transloco.translate('pos.messages.stockMaxReached', { stock: lote.cantidadFisica }));
      return;
    }
    if (cantidadIngresada <= 0 || precioIngresado <= 0) {
      this.notifier.showError(this.transloco.translate('pos.messages.cantidadPrecioInvalidos'));
      return;
    }

    this.pushCartLine(lote, cantidadBase, precioUnitarioBase, presentacion, cantidadIngresada);
    this.selectedLote.set(null);
    this.selectedMedicamentoId.set(null);
    this.loteOptions.set([]);
    this.presentacionOptions.set([]);
    this.selectedPresentacionId.set('');
  }

  private pushCartLine(
    lote: StockPorSucursal,
    cantidad: number,
    precio: number,
    presentacion?: PresentacionVenta | null,
    cantidadEnPresentacion?: number,
  ): void {
    const key = (l: { loteId: string; presentacionVentaId?: string }): string => `${l.loteId}|${l.presentacionVentaId ?? ''}`;
    const nuevaKey = key({ loteId: lote.loteId, presentacionVentaId: presentacion?.id });
    const existente = this.cart().find(l => key(l) === nuevaKey);
    if (existente) {
      const cantidadDeseada = existente.cantidad + cantidad;
      if (cantidadDeseada > lote.cantidadFisica) {
        this.notifier.showError(this.transloco.translate('pos.messages.stockMaxReached', { stock: lote.cantidadFisica }));
      }
      const cantidadFinal = Math.min(cantidadDeseada, lote.cantidadFisica);
      this.cart.update(items =>
        items.map(it =>
          key(it) === nuevaKey
            ? {
                ...it,
                cantidad: cantidadFinal,
                precioUnitario: precio || it.precioUnitario,
                cantidadEnPresentacion: presentacion ? (it.cantidadEnPresentacion ?? 0) + (cantidadEnPresentacion ?? 0) : undefined,
              }
            : it,
        ),
      );
      return;
    }
    this.cart.update(items => [
      ...items,
      {
        loteId: lote.loteId,
        productoNombre: lote.productoNombre,
        numeroLote: lote.numeroLote,
        cantidadDisponible: lote.cantidadFisica,
        cantidad,
        precioUnitario: precio,
        presentacionVentaId: presentacion?.id,
        presentacionDescripcion: presentacion?.descripcion,
        cantidadEnPresentacion: presentacion ? cantidadEnPresentacion : undefined,
        presentacionCantidadUnidadesBase: presentacion?.cantidadUnidadesBase,
      },
    ]);
  }

  // ── Scan prescription ──────────────────────────────────
  private readSelectedFile(file: File): void {
    this.recetaImagen.set(file);
    this.itemsDetectados.set(null);
    this.itemsAgregadosNombres.set(new Set());
    const reader = new FileReader();
    reader.onload = e => this.recetaPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onRecetaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.readSelectedFile(file);
    input.value = '';
  }

  onRecetaDragOver(event: DragEvent): void {
    event.preventDefault();
    this.recetaDragging.set(true);
  }

  onRecetaDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.recetaDragging.set(false);
  }

  onRecetaDrop(event: DragEvent): void {
    event.preventDefault();
    this.recetaDragging.set(false);
    if (this.recetaLoading()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) this.readSelectedFile(file);
  }

  interpretarReceta(): void {
    const imagen = this.recetaImagen();
    if (!imagen) return;

    this.recetaLoading.set(true);
    this.recetaMedicaService.analizar(imagen).subscribe({
      next: items => {
        this.itemsDetectados.set(items);
        this.recetaLoading.set(false);
      },
      error: () => {
        this.recetaLoading.set(false);
        this.notifier.showError(this.transloco.translate('recetasMedicas.scanner.error'));
      },
    });
  }

  limpiarReceta(): void {
    this.recetaImagen.set(null);
    this.recetaPreview.set(null);
    this.itemsDetectados.set(null);
    this.itemsAgregadosNombres.set(new Set());
  }

  confianzaLabel(confianza: number): string {
    const t = (k: string): string => this.transloco.translate(k, {}, 'recetasMedicas');
    if (confianza >= 0.85) return t('scanner.confidence-high');
    if (confianza >= 0.65) return t('scanner.confidence-medium');
    return t('scanner.confidence-low');
  }

  confianzaClass(confianza: number): string {
    if (confianza >= 0.85) return 'high';
    if (confianza >= 0.65) return 'med';
    return 'low';
  }

  itemAgregado(item: ItemSugerido): boolean {
    return this.itemsAgregadosNombres().has(item.nombreOficial);
  }

  agregarItemDesdeReceta(item: ItemSugerido): void {
    if (!item.tieneStock || this.itemAgregado(item)) return;

    const sucursalId = this.authService.sucursalId();
    this.stockService.search({ productoNombre: item.nombreOficial, soloConStock: true, pageNumber: 1, pageSize: 20 }).subscribe({
      next: result => {
        const lote = result.items.find(l => l.sucursalId === sucursalId);
        if (!lote) {
          this.notifier.showError(this.transloco.translate('pos.messages.noStockLocalReceta'));
          return;
        }
        const cantidad = Math.min(item.cantidadSugerida ?? 1, lote.cantidadFisica);
        this.pushCartLine(lote, cantidad, 0);
        this.itemsAgregadosNombres.update(set => new Set(set).add(item.nombreOficial));
      },
      error: () => this.notifier.showError(this.transloco.translate('pos.messages.noStockLocalReceta')),
    });
  }

  // ── Cart ────────────────────────────────────────────────
  ajustarCantidadCarrito(index: number, delta: number): void {
    this.cart.update(items =>
      items.map((it, i) => {
        if (i !== index) return it;
        // A line sold "por presentación" (e.g. Caja x10) steps by whole presentaciones, not single base units.
        const paso = it.presentacionCantidadUnidadesBase ?? 1;
        const nueva = it.cantidad + delta * paso;
        if (nueva <= 0) return it;
        if (nueva > it.cantidadDisponible) {
          this.notifier.showError(this.transloco.translate('pos.messages.stockMaxReached', { stock: it.cantidadDisponible }));
          return it;
        }
        const nuevaEnPresentacion = it.cantidadEnPresentacion !== undefined ? it.cantidadEnPresentacion + delta : undefined;
        return { ...it, cantidad: nueva, cantidadEnPresentacion: nuevaEnPresentacion };
      }),
    );
  }

  actualizarPrecioCarrito(index: number, precio: number): void {
    this.cart.update(items => items.map((it, i) => (i === index ? { ...it, precioUnitario: precio } : it)));
  }

  quitarDelCarrito(index: number): void {
    this.cart.update(items => items.filter((_, i) => i !== index));
  }

  vaciarCarrito(): void {
    this.cart.set([]);
  }

  // ── Customer / Insurance ───────────────────────────────
  displayCliente = (p: PacienteListItem | string | null): string => (p && typeof p === 'object' ? p.nombreApellidos : (p ?? ''));

  onClienteSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectCliente(event.option.value as PacienteListItem);
  }

  selectCliente(paciente: PacienteListItem): void {
    this.selectedCliente.set(paciente);
    this.clienteOptions.set([]);
  }

  limpiarCliente(): void {
    this.clienteForm.controls.clienteNombre.setValue('', { emitEvent: false });
    this.selectedCliente.set(null);
  }

  clienteIniciales(): string {
    const nombre = this.selectedCliente()?.nombreApellidos;
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  toggleSeguro(): void {
    this.seguroExpanded.update(v => !v);
  }

  displayAseguradora = (a: AseguradoraListItem | string | null): string => (a && typeof a === 'object' ? a.nombreComercial : (a ?? ''));

  onAseguradoraSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectAseguradora(event.option.value as AseguradoraListItem);
  }

  selectAseguradora(aseguradora: AseguradoraListItem): void {
    this.selectedAseguradora.set(aseguradora);
    this.aseguradoraOptions.set([]);
  }

  // ── Payments ────────────────────────────────────────────
  seleccionarMetodoPagoSimple(metodo: MetodoPago): void {
    this.pagos.set([{ metodoPago: metodo, monto: this.montoAPagar(), referencia: '' }]);
  }

  actualizarMontoPagoSimple(monto: number): void {
    this.updatePago(0, { monto });
  }

  activarPagoAvanzado(): void {
    this.modoPagoAvanzado.set(true);
  }

  volverAPagoSimple(): void {
    this.modoPagoAvanzado.set(false);
    this.pagos.set([{ metodoPago: MetodoPago.Efectivo, monto: this.montoAPagar(), referencia: '' }]);
  }

  metodoPagoIcon(metodo: MetodoPago): string {
    switch (metodo) {
      case MetodoPago.Efectivo:
        return 'payments';
      case MetodoPago.YapePlin:
        return 'smartphone';
      case MetodoPago.Tarjeta:
        return 'credit_card';
      default:
        return 'account_balance';
    }
  }

  agregarPago(): void {
    const usados = new Set(this.pagos().map(p => p.metodoPago));
    const metodo = this.metodoPagoOpciones.find(m => !usados.has(m)) ?? MetodoPago.Efectivo;
    this.pagos.update(items => [...items, { metodoPago: metodo, monto: 0, referencia: '' }]);
  }

  quitarPago(index: number): void {
    if (this.pagos().length <= 1) {
      return;
    }
    this.pagos.update(items => items.filter((_, i) => i !== index));
  }

  updatePago(index: number, patch: Partial<PagoLine>): void {
    this.pagos.update(items => {
      const current = { ...items[index], ...patch };
      if (patch.metodoPago === undefined) {
        return items.map((p, i) => (i === index ? current : p));
      }
      const rest = items.filter((_, i) => i !== index);
      const dupIndex = rest.findIndex(p => p.metodoPago === current.metodoPago);
      if (dupIndex === -1) {
        return items.map((p, i) => (i === index ? current : p));
      }
      return rest.map((p, i) => (i === dupIndex ? { ...p, monto: p.monto + current.monto, referencia: p.referencia || current.referencia } : p));
    });
  }

  metodoPagoLabel(metodo: MetodoPago): string {
    const key = MetodoPago[metodo].charAt(0).toLowerCase() + MetodoPago[metodo].slice(1);
    return this.transloco.translate(`pos.checkout.${key}`);
  }

  // Cantidad sent to the backend is base units, unless a presentación was picked — then it's the
  // quantity in that presentación's own units (e.g. 2 Cajas), and the backend resolves the conversion.
  private buildDetalleRequests(): CreateVentaDetalleRequest[] {
    return this.cart().map(l => ({
      loteId: l.loteId,
      cantidad: l.presentacionVentaId ? l.cantidadEnPresentacion! : l.cantidad,
      precioUnitario: l.precioUnitario,
      costoHistorico: 0,
      presentacionVentaId: l.presentacionVentaId,
    }));
  }

  // ── Process sale ────────────────────────────────────────
  procesarVenta(): void {
    if (!this.puedeProcesar()) {
      return;
    }

    const dialogData: ConfirmarVentaDialogData = {
      total: this.montoAPagar(),
      itemsCount: this.cart().length,
      clienteNombre: this.selectedCliente()?.nombreApellidos ?? this.transloco.translate('pos.checkout.clienteEventual'),
      metodosPago: this.pagos().map(p => this.metodoPagoLabel(p.metodoPago)),
      montoPendiente: this.montoPendiente(),
    };

    const ref = this.dialog.open(ConfirmarVentaDialogComponent, { width: '450px', data: dialogData });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.enviarVenta();
      }
    });
  }

  guardarPendiente(): void {
    if (!this.puedeGuardarPendiente()) {
      return;
    }

    this.guardandoPendiente.set(true);
    const continuandoId = this.continuandoVentaId();

    if (continuandoId) {
      this.ventaService
        .actualizarDetalles(continuandoId, {
          detalles: this.buildDetalleRequests(),
          clienteId: this.selectedCliente()?.id,
        })
        .subscribe({
          next: () => {
            this.guardandoPendiente.set(false);
            this.notifier.showSuccess(this.transloco.translate('pos.messages.ventaPendienteGuardada'));
            this.resetVenta();
            this.router.navigate(['/pos/nueva']);
          },
          error: () => {
            this.guardandoPendiente.set(false);
            this.notifier.showError(this.transloco.translate('pos.messages.ventaError'));
          },
        });
      return;
    }

    const request: CreateVentaRequest = {
      clienteId: this.selectedCliente()?.id,
      sesionId: this.sesionId()!,
      detalles: this.buildDetalleRequests(),
      pagos: [],
      estado: EstadoVenta.Pendiente,
    };

    this.ventaService.crear(request).subscribe({
      next: res => {
        this.guardandoPendiente.set(false);
        this.notifier.showSuccess(this.transloco.translate('pos.messages.ventaPendienteGuardada'));
        this.persistPagosDraftForVenta(res.ventaId);
        this.resetVenta();
      },
      error: () => {
        this.guardandoPendiente.set(false);
        this.notifier.showError(this.transloco.translate('pos.messages.ventaError'));
      },
    });
  }

  private enviarVenta(): void {
    this.procesando.set(true);

    const detalles = this.buildDetalleRequests();
    const pagosRequest = this.pagos().map(p => ({
      metodoPago: p.metodoPago,
      montoPagado: p.monto,
      referenciaOperacion: p.referencia || undefined,
    }));

    const continuandoId = this.continuandoVentaId();
    const venta$ = continuandoId
      ? this.ventaService.completar(continuandoId, {
          pagos: pagosRequest,
          detalles,
          clienteId: this.selectedCliente()?.id,
          aseguradoraId: this.selectedAseguradora()?.id,
          montoCubiertoSeguro: this.seguroForm.value.montoCubierto ?? undefined,
        })
      : this.ventaService.crear({
          clienteId: this.selectedCliente()?.id,
          sesionId: this.sesionId()!,
          detalles,
          pagos: pagosRequest,
          aseguradoraId: this.selectedAseguradora()?.id,
          montoCubiertoSeguro: this.seguroForm.value.montoCubierto ?? undefined,
        });

    venta$.subscribe({
      next: res => {
        this.procesando.set(false);
        localStorage.removeItem(this.draftKey);
        const dialogData: ComprobanteDialogData = {
          comprobante: res.comprobante,
          total: this.montoAPagar(),
          subtotal: this.subtotalSinIgv(),
          igv: this.igv(),
          metodosPago: this.pagos().map(p => this.metodoPagoLabel(p.metodoPago)).join(', '),
          detalles: this.cart().map(l => ({ productoNombre: l.productoNombre, numeroLote: l.numeroLote, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
          pagos: this.pagos().map(p => ({ metodo: this.metodoPagoLabel(p.metodoPago), monto: p.monto })),
          clienteNombre: this.selectedCliente()?.nombreApellidos ?? this.transloco.translate('pos.checkout.clienteEventual'),
          empresaNombre: this.authService.currentUser()?.nombreEmpresa ?? null,
          cajeroNombre: this.authService.currentUser()?.fullName ?? null,
          fecha: new Date(),
        };
        const ref = this.dialog.open(ComprobanteDialogComponent, { width: '500px', data: dialogData, disableClose: true });
        ref.afterClosed().subscribe((action: string) => {
          this.resetVenta();
          if (action === 'volver') {
            this.router.navigate(['/pos']);
          } else {
            this.router.navigate(['/pos/nueva']);
          }
        });
      },
      error: () => {
        this.procesando.set(false);
        this.notifier.showError(this.transloco.translate('pos.messages.ventaError'));
      },
    });
  }

  private resetVenta(): void {
    this.cart.set([]);
    this.pagos.set([{ metodoPago: MetodoPago.Efectivo, monto: 0, referencia: '' }]);
    this.modoPagoAvanzado.set(false);
    this.limpiarCliente();
    this.seguroForm.reset();
    this.selectedAseguradora.set(null);
    this.seguroExpanded.set(false);
    this.selectedLote.set(null);
    this.selectedMedicamentoId.set(null);
    this.loteOptions.set([]);
    this.presentacionOptions.set([]);
    this.selectedPresentacionId.set('');
    this.limpiarReceta();
    this.activeTab.set('buscar');
    this.continuandoVentaId.set(null);
  }
}
