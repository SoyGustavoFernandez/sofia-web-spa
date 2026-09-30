// Drafts live in localStorage on shared POS terminals: keep ids only (no customer PII) and let them expire
export const POS_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

export interface PosDraft<TLine, TPago, TAseguradora> {
  cart: TLine[];
  pagos: TPago[];
  clienteId: string | null;
  recetaId: string;
  aseguradora: TAseguradora | null;
  montoCubierto: number | null;
  seguroExpanded: boolean;
}

interface StoredPosDraft<TLine, TPago, TAseguradora> extends PosDraft<TLine, TPago, TAseguradora> {
  savedAt: number;
}

export function isEmptyPosDraft<TLine, TPago, TAseguradora>(draft: PosDraft<TLine, TPago, TAseguradora>): boolean {
  return draft.cart.length === 0 && !draft.clienteId && !draft.aseguradora;
}

export function serializePosDraft<TLine, TPago, TAseguradora>(draft: PosDraft<TLine, TPago, TAseguradora>, now: number = Date.now()): string {
  const stored: StoredPosDraft<TLine, TPago, TAseguradora> = {
    cart: draft.cart,
    pagos: draft.pagos,
    clienteId: draft.clienteId,
    recetaId: draft.recetaId,
    aseguradora: draft.aseguradora,
    montoCubierto: draft.montoCubierto,
    seguroExpanded: draft.seguroExpanded,
    savedAt: now,
  };
  return JSON.stringify(stored);
}

// Null for missing, corrupt, expired or legacy (pre-TTL, PII-carrying) drafts: the caller discards them
export function parsePosDraft<TLine, TPago, TAseguradora>(raw: string | null, now: number = Date.now()): PosDraft<TLine, TPago, TAseguradora> | null {
  if (!raw) return null;
  let value: Partial<StoredPosDraft<TLine, TPago, TAseguradora>>;
  try {
    value = JSON.parse(raw) as Partial<StoredPosDraft<TLine, TPago, TAseguradora>>;
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || typeof value.savedAt !== 'number') return null;
  if (now - value.savedAt > POS_DRAFT_TTL_MS) return null;
  return {
    cart: Array.isArray(value.cart) ? value.cart : [],
    pagos: Array.isArray(value.pagos) ? value.pagos : [],
    clienteId: typeof value.clienteId === 'string' && value.clienteId ? value.clienteId : null,
    recetaId: typeof value.recetaId === 'string' ? value.recetaId : '',
    aseguradora: value.aseguradora ?? null,
    montoCubierto: value.montoCubierto ?? null,
    seguroExpanded: value.seguroExpanded === true,
  };
}
