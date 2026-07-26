import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { STORED_LINE_BREAK } from '@shared/constants/line-break-placeholder';

/**
 * Convierte el placeholder {{BR}} en <br> y escapa el resto del HTML para usarlo en [innerHTML].
 * Uso en reportes: [innerHTML]="cargoDescription | lineBreakToBr"
 */
@Pipe({ name: 'lineBreakToBr', standalone: true })
export class LineBreakToBrPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (value == null || value === '') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const escaped = this.escapeHtml(String(value));
    const withBr = escaped.replace(new RegExp(STORED_LINE_BREAK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(withBr);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
  }
}
