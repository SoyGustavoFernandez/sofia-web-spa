import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export const RECEIPT_FRAME_ID = 'pos-receipt-print-frame';
export const RECEIPT_PAPER_WIDTH_MM = 80;

const PX_PER_MM = 96 / 25.4;
const PAGE_HEIGHT_SLACK_MM = 6;

// Layout of the isolated receipt document: 80 mm roll with a 72 mm printable column
export const RECEIPT_PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: ${RECEIPT_PAPER_WIDTH_MM}mm; padding: 2mm 4mm; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.3; }
  .pos-print-receipt { display: block; width: 100%; }
  .pos-print-header { text-align: center; margin-bottom: 8px; overflow-wrap: anywhere; }
  .pos-print-empresa { font-weight: 700; font-size: 14px; }
  .pos-print-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 6px; font-size: 11px; }
  .pos-print-table th, .pos-print-table td { border-bottom: 1px dashed #000; padding: 2px 1px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  .pos-print-table th:nth-child(1) { width: 50%; }
  .pos-print-table th:nth-child(2) { width: 10%; }
  .pos-print-table th:nth-child(3) { width: 19%; }
  .pos-print-table th:nth-child(4) { width: 21%; }
  .pos-print-table th:nth-child(n + 2), .pos-print-table td:nth-child(n + 2) { text-align: right; white-space: nowrap; overflow-wrap: normal; }
  .pos-print-table tr { break-inside: avoid; }
  .pos-print-row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  .pos-print-row span:first-child { flex: 0 0 auto; }
  .pos-print-row span:last-child { text-align: right; overflow-wrap: anywhere; }
  .pos-print-total { font-weight: 700; font-size: 13px; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
`;

@Injectable({ providedIn: 'root' })
export class ReceiptPrintService {
  private readonly document = inject(DOCUMENT);

  // Prints a copy of the element alone in a hidden same-origin iframe so nothing of the app reaches the paper
  print(receipt: HTMLElement): void {
    this.document.getElementById(RECEIPT_FRAME_ID)?.remove();

    const iframe = this.document.createElement('iframe');
    iframe.id = RECEIPT_FRAME_ID;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${RECEIPT_PAPER_WIDTH_MM}mm;height:0;border:0;`;
    this.document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument;
    if (!frameWindow || !frameDocument) {
      iframe.remove();
      return;
    }

    // A doctype keeps the blank frame out of quirks mode so it is measured exactly as it prints
    frameDocument.open();
    frameDocument.write('<!DOCTYPE html><html><head></head><body></body></html>');
    frameDocument.close();

    const style = frameDocument.createElement('style');
    style.textContent = RECEIPT_PRINT_STYLES;
    frameDocument.head.appendChild(style);
    frameDocument.body.appendChild(frameDocument.importNode(receipt, true));

    // The page is as tall as the ticket so a long one comes out complete in a single continuous page
    const heightMm = Math.ceil(frameDocument.documentElement.scrollHeight / PX_PER_MM) + PAGE_HEIGHT_SLACK_MM;
    const page = frameDocument.createElement('style');
    page.textContent = `@page { size: ${RECEIPT_PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; }`;
    frameDocument.head.appendChild(page);

    frameWindow.addEventListener('afterprint', () => iframe.remove(), { once: true });
    frameWindow.focus();
    frameWindow.print();
  }
}
