import { TestBed } from '@angular/core/testing';
import { RECEIPT_FRAME_ID, ReceiptPrintService } from './receipt-print.service';

function buildReceipt(lineas: number): HTMLElement {
  const receipt = document.createElement('div');
  receipt.className = 'pos-print-receipt';
  const table = document.createElement('table');
  table.className = 'pos-print-table';
  for (let i = 1; i <= lineas; i++) {
    const cell = table.insertRow().insertCell();
    cell.textContent = `Producto ${i}`;
  }
  const total = document.createElement('div');
  total.className = 'pos-print-row pos-print-total';
  total.textContent = 'Total S/ 50.00';
  receipt.append(table, total);
  return receipt;
}

describe('ReceiptPrintService', () => {
  let service: ReceiptPrintService;
  let printSpy: jasmine.Spy;

  const frame = () => document.getElementById(RECEIPT_FRAME_ID) as HTMLIFrameElement | null;
  const frameStyles = () => Array.from(frame()?.contentDocument?.querySelectorAll('style') ?? [], (s) => s.textContent ?? '').join('\n');

  beforeEach(() => {
    service = TestBed.inject(ReceiptPrintService);
    printSpy = jasmine.createSpy('print');
    const appendChild = document.body.appendChild.bind(document.body);
    // Stubs the native print of the frame window as soon as the iframe is attached
    spyOn(document.body, 'appendChild').and.callFake(<T extends Node>(node: T): T => {
      appendChild(node);
      if (node instanceof HTMLIFrameElement && node.contentWindow) node.contentWindow.print = printSpy;
      return node;
    });
  });

  afterEach(() => frame()?.remove());

  it('prints a copy of the receipt alone inside a hidden iframe', () => {
    const receipt = buildReceipt(2);
    service.print(receipt);

    const body = frame()?.contentDocument?.body;
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(body?.children.length).toBe(1);
    expect(body?.querySelector('.pos-print-receipt')?.textContent).toBe(receipt.textContent);
    expect(frame()?.getBoundingClientRect().right).toBeLessThan(0);
  });

  it('lays the page out as an 80 mm roll without margins', () => {
    service.print(buildReceipt(2));

    expect(frameStyles()).toMatch(/@page \{ size: 80mm \d+mm; margin: 0; \}/);
    const doc = frame()?.contentDocument;
    const copy = doc?.querySelector<HTMLElement>('.pos-print-receipt');
    expect(copy && doc?.defaultView?.getComputedStyle(copy).display).toBe('block');
  });

  it('keeps every line of a long ticket and grows the page with it', () => {
    const pageHeight = () => Number(/size: 80mm (\d+)mm/.exec(frameStyles())?.[1]);
    service.print(buildReceipt(2));
    const shortHeight = pageHeight();
    service.print(buildReceipt(45));

    const doc = frame()?.contentDocument;
    expect(doc?.querySelectorAll('.pos-print-table tr').length).toBe(45);
    expect(doc?.querySelector('.pos-print-total')?.textContent).toBe('Total S/ 50.00');
    expect(pageHeight()).toBeGreaterThan(shortHeight);
  });

  it('removes the iframe after printing and never stacks frames', () => {
    service.print(buildReceipt(1));
    service.print(buildReceipt(1));
    expect(document.querySelectorAll(`#${RECEIPT_FRAME_ID}`).length).toBe(1);

    frame()?.contentWindow?.dispatchEvent(new Event('afterprint'));
    expect(frame()).toBeNull();
  });
});
