import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// SUNAT catálogo 06 codes stored as the patient's document type: DNI, carné de extranjería, RUC and pasaporte
export const TIPOS_DOCUMENTO_IDENTIDAD = ['1', '4', '6', '7'] as const;

const FORMATOS: Record<string, RegExp> = {
  '1': /^\d{8}$/,
  '4': /^[A-Za-z0-9]{1,12}$/,
  '6': /^\d{11}$/,
  '7': /^[A-Za-z0-9]{1,20}$/,
};

// Root i18n key of a document type label; codes without a known label (legacy rows) resolve to null
export function tipoDocumentoKey(tipo: string | null | undefined): string | null {
  return tipo && (tipo in FORMATOS || tipo === '-') ? `tipos-documento.${tipo}` : null;
}

export function documentoIdentidadValido(tipo: string | null | undefined, numero: string | null | undefined): boolean {
  const formato = tipo ? FORMATOS[tipo] : undefined;
  return !!formato && !!numero && formato.test(numero);
}

// Checks the number against the sibling document type control; empty values are left to Validators.required
export function documentoIdentidadValidator(tipoControlName = 'tipoDocumento'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const tipo: unknown = control.parent?.get(tipoControlName)?.value;
    const numero: unknown = control.value;
    if (typeof tipo !== 'string' || !tipo || typeof numero !== 'string' || !numero) return null;
    return documentoIdentidadValido(tipo, numero) ? null : { documentoFormato: true };
  };
}
