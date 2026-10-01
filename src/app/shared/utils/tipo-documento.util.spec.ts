import { FormControl, FormGroup } from '@angular/forms';
import { documentoIdentidadValidator, documentoIdentidadValido, tipoDocumentoKey } from './tipo-documento.util';

describe('tipo-documento util', () => {
  it('validates each number against the format of its document type', () => {
    expect(documentoIdentidadValido('1', '45781236')).toBeTrue();
    expect(documentoIdentidadValido('1', '4578123')).toBeFalse();
    expect(documentoIdentidadValido('6', '20212971893')).toBeTrue();
    expect(documentoIdentidadValido('6', '2021297189')).toBeFalse();
    expect(documentoIdentidadValido('4', 'CE0012345678')).toBeTrue();
    expect(documentoIdentidadValido('4', 'CE00123456789')).toBeFalse();
    expect(documentoIdentidadValido('7', 'AB12345678901234567C')).toBeTrue();
    expect(documentoIdentidadValido('7', 'AB-123')).toBeFalse();
    expect(documentoIdentidadValido(null, '45781236')).toBeFalse();
  });

  it('flags the number control when it does not match the selected type', () => {
    const form = new FormGroup({
      tipoDocumento: new FormControl<string | null>('1'),
      docIdentidadGub: new FormControl('123', [documentoIdentidadValidator()]),
    });
    form.controls.docIdentidadGub.updateValueAndValidity();
    expect(form.controls.docIdentidadGub.hasError('documentoFormato')).toBeTrue();

    form.controls.tipoDocumento.setValue('7');
    form.controls.docIdentidadGub.updateValueAndValidity();
    expect(form.controls.docIdentidadGub.valid).toBeTrue();
  });

  it('maps known codes to root i18n keys and ignores unknown ones', () => {
    expect(tipoDocumentoKey('1')).toBe('tipos-documento.1');
    expect(tipoDocumentoKey('-')).toBe('tipos-documento.-');
    expect(tipoDocumentoKey(null)).toBeNull();
    expect(tipoDocumentoKey('X')).toBeNull();
  });
});
