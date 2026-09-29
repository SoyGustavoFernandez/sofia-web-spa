import { HttpErrorResponse } from '@angular/common/http';
import { saveErrorKey } from './save-error-key.util';

describe('saveErrorKey', () => {
  const pageKeys = { 'Paciente.DocIdentidadGub.Duplicado': 'pacientes.detail.duplicate-documento' };
  const conflict = (code: string): HttpErrorResponse => new HttpErrorResponse({ status: 409, error: { code } });

  it('prefers the page-specific message for a known business code', () => {
    expect(saveErrorKey(conflict('Paciente.DocIdentidadGub.Duplicado'), pageKeys, 'pacientes.detail.save-error')).toBe(
      'pacientes.detail.duplicate-documento',
    );
  });

  it('falls back to the generic database messages for constraint codes', () => {
    expect(saveErrorKey(conflict('Db.Duplicado'), pageKeys, 'x.save-error')).toBe('errors.dbDuplicado');
    expect(saveErrorKey(conflict('Db.ReferenciaInvalida'), pageKeys, 'x.save-error')).toBe('errors.dbReferenciaInvalida');
    expect(saveErrorKey(new HttpErrorResponse({ status: 400, error: { code: 'Db.ValorInvalido' } }), pageKeys, 'x.save-error')).toBe(
      'errors.dbValorInvalido',
    );
  });

  it('uses the page fallback for unknown codes and non-http errors', () => {
    expect(saveErrorKey(conflict('Otro.Codigo'), pageKeys, 'x.save-error')).toBe('x.save-error');
    expect(saveErrorKey(new HttpErrorResponse({ status: 500 }), pageKeys, 'x.save-error')).toBe('x.save-error');
    expect(saveErrorKey(new Error('boom'), pageKeys, 'x.save-error')).toBe('x.save-error');
  });
});
