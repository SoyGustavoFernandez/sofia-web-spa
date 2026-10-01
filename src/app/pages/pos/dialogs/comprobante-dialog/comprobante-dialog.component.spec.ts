import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
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

function setup(overrides: Partial<ComprobanteDto> = {}) {
  const data: ComprobanteDialogData = {
    comprobante: { ...comprobante, ...overrides },
    total: 50,
    subtotal: 42.37,
    igv: 7.63,
    metodosPago: 'Efectivo',
    detalles: [],
    pagos: [],
    clienteNombre: 'Juan Perez',
    cajeroNombre: 'Cajero QA',
    fecha: new Date(2026, 8, 30),
  };
  const receiptPrint = jasmine.createSpyObj<ReceiptPrintService>('ReceiptPrintService', ['print']);
  TestBed.configureTestingModule({
    imports: [ComprobanteDialogComponent],
    providers: [
      provideNoopAnimations(),
      provideTranslocoTesting(),
      { provide: MatDialogRef, useValue: { close: () => undefined } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: ReceiptPrintService, useValue: receiptPrint },
    ],
  });
  const fixture = TestBed.createComponent(ComprobanteDialogComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, receiptPrint, text: (fixture.nativeElement as HTMLElement).textContent ?? '' };
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

  it('sends only the receipt element to the isolated printer', () => {
    const { component, receiptPrint } = setup();
    component.imprimir();
    expect(receiptPrint.print).toHaveBeenCalledTimes(1);
    const printed = receiptPrint.print.calls.mostRecent().args[0];
    expect(printed.classList).toContain('pos-print-receipt');
    expect(printed.textContent).toContain('B001-00000012');
    expect(printed.querySelector('button')).toBeNull();
  });
});
