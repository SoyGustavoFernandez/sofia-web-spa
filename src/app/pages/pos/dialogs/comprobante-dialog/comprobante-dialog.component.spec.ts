import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { ComprobanteDto } from '../../models/venta.model';
import { ReceiptPrintService } from '../../services/receipt-print.service';
import { ComprobanteDialogComponent, ComprobanteDialogData } from './comprobante-dialog.component';

const comprobante: ComprobanteDto = {
  tipo: 'Boleta',
  numero: 'B001-00000012',
  estadoAceptacion: 'NoEnviado',
  urlVerificacion: null,
  urlXml: null,
  urlCdr: null,
  emisorRazonSocial: 'Botica QA',
  emisorRuc: '20212971893',
  sucursalDireccion: 'Av. Arequipa 123',
  clienteTipoDocumento: '1',
  clienteNumeroDocumento: '45781236',
  clienteNombre: 'Juan Perez',
};

function setup(overrides: Partial<ComprobanteDto> = {}, permisos: string[] = ['Ventas:Crear'], dataOverrides: Partial<ComprobanteDialogData> = {}) {
  const data: ComprobanteDialogData = {
    comprobante: { ...comprobante, ...overrides },
    total: 50,
    subtotal: 42.37,
    igv: 7.63,
    metodosPago: 'Efectivo',
    detalles: [],
    pagos: [],
    vuelto: 0,
    clienteNombre: 'Juan Perez',
    cajeroNombre: 'Cajero QA',
    fecha: new Date(2026, 8, 30),
    ...dataOverrides,
  };
  const receiptPrint = jasmine.createSpyObj<ReceiptPrintService>('ReceiptPrintService', ['print']);
  TestBed.configureTestingModule({
    imports: [ComprobanteDialogComponent],
    providers: [
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
      { provide: MatDialogRef, useValue: { close: () => undefined } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: ReceiptPrintService, useValue: receiptPrint },
    ],
  });
  const fixture = TestBed.createComponent(ComprobanteDialogComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const printed = root.querySelector('.pos-print-receipt') as HTMLElement;
  return { fixture, component: fixture.componentInstance, receiptPrint, text: root.textContent ?? '', printed };
}

describe('ComprobanteDialogComponent', () => {
  it('prints the issuer legal data and the customer document on the receipt', () => {
    const { component, text } = setup();
    expect(text).toContain('Botica QA');
    expect(text).toContain('20212971893');
    expect(text).toContain('Av. Arequipa 123');
    expect(text).not.toContain('SOFIA');
    expect(component.clienteDocumento()).toBe('tipos-documento.1 45781236');
  });

  it('shows the status through its i18n key instead of the raw value', () => {
    const { component } = setup();
    expect(component.estadoLabel('NoEnviado')).toBe('pos.estadoComprobante.NoEnviado');
    expect(component.estadoLabel('Desconocido')).toBe('Desconocido');
  });

  it('prints no document for the anonymous customer', () => {
    const { component } = setup({ clienteTipoDocumento: '-', clienteNumeroDocumento: '00000000', clienteNombre: 'CLIENTE EVENTUAL' });
    expect(component.clienteDocumento()).toBeNull();
  });

  it('offers starting a new sale only to a user who can create sales', () => {
    expect(setup().text).toContain('pos.actions.nuevaVenta');
    TestBed.resetTestingModule();

    const { text } = setup({}, ['Ventas:Leer']);

    expect(text).not.toContain('pos.actions.nuevaVenta');
    expect(text).toContain('pos.actions.imprimirComprobante');
  });

  it('sends only the receipt element to the isolated printer', () => {
    const { component, receiptPrint } = setup();
    component.imprimir();
    expect(receiptPrint.print).toHaveBeenCalledTimes(1);
    const printed = receiptPrint.print.calls.mostRecent().args[0];
    expect(printed.classList).toContain('pos-print-receipt');
    expect(printed.textContent).toContain('B001-00000012');
    expect(printed.querySelector('button')).toBeNull();
  });

  describe('printed change', () => {
    const pagos = [{ metodo: 'Efectivo', monto: 10 }];

    it('prints the change after the payments when there is any', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { total: 7.5, pagos, vuelto: 2.5 });
      const rows = Array.from(printed.querySelectorAll('.pos-print-row')).map(r => r.textContent?.replace(/\s+/g, ' ').trim());

      const pago = rows.findIndex(r => r?.startsWith('Efectivo'));
      expect(rows[pago + 1]).toBe('pos.checkout.vueltoCortoLabelS/ 2.50');
    });

    it('prints no change row when the payment was exact', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { total: 7.5, pagos: [{ metodo: 'Efectivo', monto: 7.5 }], vuelto: 0 });
      expect(printed.textContent).not.toContain('pos.checkout.vueltoCortoLabel');
    });
  });

  describe('printed lines', () => {
    const detalles = [
      { productoNombre: 'Paracetamol', numeroLote: 'L-A', cantidad: 10, precioUnitario: 2.2, presentacionDescripcion: 'Caja', cantidadEnPresentacion: 1 },
      { productoNombre: 'Paracetamol', numeroLote: 'L-A', cantidad: 2, precioUnitario: 2.5 },
    ];

    function filas(printed: HTMLElement): string[][] {
      return Array.from(printed.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.replace(/\s+/g, ' ').trim() ?? ''));
    }

    it('prints a line sold by presentation with its presentation quantity, price and the same total', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { detalles });
      expect(filas(printed)[0]).toEqual(['Paracetamol (L-A)', '1 × Caja (10)', '22.00', '22.00']);
    });

    it('prints a loose line of the same lot in units', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { detalles });
      expect(filas(printed)[1]).toEqual(['Paracetamol (L-A)', '2', '2.50', '5.00']);
    });

    it('renders two rows for two lines of the same lot', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { detalles });
      expect(printed.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('prints a line with a presentation description but no presentation quantity in units', () => {
      const { printed } = setup({}, ['Ventas:Crear'], { detalles: [{ ...detalles[1], presentacionDescripcion: 'Caja', cantidadEnPresentacion: null }] });
      expect(filas(printed)[0]).toEqual(['Paracetamol (L-A)', '2', '2.50', '5.00']);
    });
  });
});
