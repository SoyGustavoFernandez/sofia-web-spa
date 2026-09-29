import { HttpErrorResponse } from '@angular/common/http';

// Database constraint codes mapped by the backend GlobalExceptionHandler, shown when a page has no specific message
const DB_ERROR_KEYS: Record<string, string> = {
  'Db.Duplicado': 'errors.dbDuplicado',
  'Db.ReferenciaInvalida': 'errors.dbReferenciaInvalida',
  'Db.ValorInvalido': 'errors.dbValorInvalido',
};

// Resolves the i18n key of a failed save: page-specific code first, then database constraint codes, then the page fallback
export function saveErrorKey(err: unknown, pageKeys: Record<string, string>, fallback: string): string {
  const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
  if (typeof code !== 'string') return fallback;
  return pageKeys[code] ?? DB_ERROR_KEYS[code] ?? fallback;
}
