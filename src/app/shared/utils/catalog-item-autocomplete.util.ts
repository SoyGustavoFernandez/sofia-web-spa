import { CatalogItemActive } from '@core/services/lookups-module/lookup-catalogs/dto/catalog-item-active';

/**
 * Texto canónico para ISO / catálogo tipo equipment_iso_codes:
 * `"Code" - "Description"` (ej. `"2000" - "20x8 Non-Vented, Open 1/Both Ends"`).
 */
export function displayCatalogCodeDescription(
  item: CatalogItemActive | null | undefined
): string {
  if (!item) {
    return '';
  }
  const code = (item.code ?? '').trim();
  const desc = (item.description ?? '').trim();
  if (code && desc) {
    return `"${code}" - "${desc}"`;
  }
  if (code) {
    return `"${code}"`;
  }
  if (desc) {
    return `"${desc}"`;
  }
  return '';
}

/** Formato anterior sin comillas; solo para reconocer valores ya guardados en blur. */
export function legacyDisplayCatalogCodeDescription(
  item: CatalogItemActive | null | undefined
): string {
  if (!item) {
    return '';
  }
  const code = (item.code ?? '').trim();
  const desc = (item.description ?? '').trim();
  if (code && desc) {
    return `${code} - ${desc}`;
  }
  return code || desc;
}

export function catalogItemDisplayMatchesInput(
  item: CatalogItemActive,
  inputValue: string
): boolean {
  const v = (inputValue ?? '').trim();
  if (!v) {
    return false;
  }
  return (
    displayCatalogCodeDescription(item) === v ||
    legacyDisplayCatalogCodeDescription(item) === v
  );
}

/**
 * Resuelve el valor del input tras blur: igualdad exacta al texto canónico,
 * coincidencia por id actual (incl. texto legacy solo descripción/código),
 * o por descripción/código únicos en la lista.
 */
export function resolveCatalogItemFromBlurInput(
  list: CatalogItemActive[],
  inputValue: string,
  currentId: number | null | undefined
): { match: CatalogItemActive | null; canonicalLabel: string | null } {
  const v = (inputValue ?? '').trim();
  if (!v) {
    return { match: null, canonicalLabel: null };
  }

  const exact = list.find(i => catalogItemDisplayMatchesInput(i, v));
  if (exact) {
    return { match: exact, canonicalLabel: displayCatalogCodeDescription(exact) };
  }

  const id = currentId == null || currentId === 0 ? null : currentId;
  if (id != null) {
    const byId = list.find(i => i.catalogItemId === id);
    if (byId) {
      const canonical = displayCatalogCodeDescription(byId);
      const legacy = legacyDisplayCatalogCodeDescription(byId);
      if (canonical === v || legacy === v) {
        return { match: byId, canonicalLabel: canonical };
      }
      const desc = (byId.description ?? '').trim();
      const code = (byId.code ?? '').trim();
      if (desc && v === desc) {
        return { match: byId, canonicalLabel: canonical };
      }
      if (code && v === code) {
        return { match: byId, canonicalLabel: canonical };
      }
    }
  }

  const descOnly = list.filter(i => (i.description ?? '').trim() === v);
  if (descOnly.length === 1) {
    const m = descOnly[0];
    return { match: m, canonicalLabel: displayCatalogCodeDescription(m) };
  }

  const codeOnly = list.filter(i => (i.code ?? '').trim() === v);
  if (codeOnly.length === 1) {
    const m = codeOnly[0];
    return { match: m, canonicalLabel: displayCatalogCodeDescription(m) };
  }

  return { match: null, canonicalLabel: null };
}

/** Sincroniza el texto mostrado desde un id de catálogo si existe en la lista. */
export function labelFromCatalogId(
  list: CatalogItemActive[],
  id: number | null | undefined
): string {
  if (id == null || id === 0) {
    return '';
  }
  const item = list.find(i => i.catalogItemId === id);
  return item ? displayCatalogCodeDescription(item) : '';
}

/**
 * Texto canónico para catálogos de cuentas (CTA_INGRESO, CTA_EGRESO, CTA_DETRACCION):
 * `"Description" - "AltCode"` (ej. `"Costo de servicios portuarios - Vigilancia" - "CD-SAP-2"`).
 */
export function displayCatalogDescriptionAltCode(
  item: CatalogItemActive | null | undefined
): string {
  if (!item) {
    return '';
  }
  const desc = (item.description ?? '').trim();
  const altCode = (item.altCode ?? '').trim();
  if (desc && altCode) {
    return `"${desc}" - "${altCode}"`;
  }
  if (desc) {
    return `"${desc}"`;
  }
  if (altCode) {
    return `"${altCode}"`;
  }
  return '';
}

/** Formato anterior sin comillas; solo para reconocer valores ya guardados en blur. */
export function legacyDisplayCatalogDescriptionAltCode(
  item: CatalogItemActive | null | undefined
): string {
  if (!item) {
    return '';
  }
  const desc = (item.description ?? '').trim();
  const altCode = (item.altCode ?? '').trim();
  if (desc && altCode) {
    return `${desc} - ${altCode}`;
  }
  return desc || altCode;
}

export function catalogItemDescriptionAltCodeMatchesInput(
  item: CatalogItemActive,
  inputValue: string
): boolean {
  const v = (inputValue ?? '').trim();
  if (!v) {
    return false;
  }
  return (
    displayCatalogDescriptionAltCode(item) === v ||
    legacyDisplayCatalogDescriptionAltCode(item) === v
  );
}

/**
 * Resuelve el valor del input tras blur para catálogos description + altCode.
 */
export function resolveCatalogItemFromDescriptionAltCodeBlurInput(
  list: CatalogItemActive[],
  inputValue: string,
  currentId: number | null | undefined
): { match: CatalogItemActive | null; canonicalLabel: string | null } {
  const v = (inputValue ?? '').trim();
  if (!v) {
    return { match: null, canonicalLabel: null };
  }

  const exact = list.find(i => catalogItemDescriptionAltCodeMatchesInput(i, v));
  if (exact) {
    return { match: exact, canonicalLabel: displayCatalogDescriptionAltCode(exact) };
  }

  const id = currentId == null || currentId === 0 ? null : currentId;
  if (id != null) {
    const byId = list.find(i => i.catalogItemId === id);
    if (byId) {
      const canonical = displayCatalogDescriptionAltCode(byId);
      const legacy = legacyDisplayCatalogDescriptionAltCode(byId);
      if (canonical === v || legacy === v) {
        return { match: byId, canonicalLabel: canonical };
      }
      const desc = (byId.description ?? '').trim();
      const altCode = (byId.altCode ?? '').trim();
      if (desc && v === desc) {
        return { match: byId, canonicalLabel: canonical };
      }
      if (altCode && v === altCode) {
        return { match: byId, canonicalLabel: canonical };
      }
    }
  }

  const descOnly = list.filter(i => (i.description ?? '').trim() === v);
  if (descOnly.length === 1) {
    const m = descOnly[0];
    return { match: m, canonicalLabel: displayCatalogDescriptionAltCode(m) };
  }

  const altCodeOnly = list.filter(i => (i.altCode ?? '').trim() === v);
  if (altCodeOnly.length === 1) {
    const m = altCodeOnly[0];
    return { match: m, canonicalLabel: displayCatalogDescriptionAltCode(m) };
  }

  return { match: null, canonicalLabel: null };
}

/** Sincroniza el texto mostrado desde un id de catálogo (description + altCode). */
export function labelFromCatalogIdDescriptionAltCode(
  list: CatalogItemActive[],
  id: number | null | undefined
): string {
  if (id == null || id === 0) {
    return '';
  }
  const item = list.find(i => i.catalogItemId === id);
  return item ? displayCatalogDescriptionAltCode(item) : '';
}

/**
 * Normaliza el texto del filtro de cuenta antes de enviarlo al API.
 * Convierte el label canónico `"description" - "altCode"` en altCode o description
 * para que el LIKE del sproc pueda matchear catalog_item.
 */
export function accountSearchTermForApi(
  raw: string | null | undefined
): string | null {
  const v = raw?.trim();
  if (!v) {
    return null;
  }
  const altMatch = v.match(/" - "([^"]+)"/);
  if (altMatch) {
    return altMatch[1];
  }
  const descMatch = v.match(/^"([^"]+)"/);
  if (descMatch) {
    return descMatch[1];
  }
  return v;
}
