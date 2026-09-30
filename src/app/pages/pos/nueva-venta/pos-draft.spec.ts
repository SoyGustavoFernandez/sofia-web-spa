import { POS_DRAFT_TTL_MS, PosDraft, isEmptyPosDraft, parsePosDraft, serializePosDraft } from './pos-draft';

interface Line { loteId: string; cantidad: number; }
interface Pago { metodoPago: number; monto: number; referencia: string; }
interface Aseguradora { id: string; nombreComercial: string; }

type Draft = PosDraft<Line, Pago, Aseguradora>;

const NOW = Date.UTC(2026, 8, 29, 12);

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    cart: [{ loteId: 'l1', cantidad: 2 }],
    pagos: [{ metodoPago: 1, monto: 10, referencia: '' }],
    clienteId: 'c1',
    recetaId: 'r1',
    aseguradora: { id: 'a1', nombreComercial: 'Rimac' },
    montoCubierto: 5,
    seguroExpanded: true,
    ...overrides,
  };
}

describe('pos-draft', () => {
  it('round-trips a draft within its time to live', () => {
    const raw = serializePosDraft(draft(), NOW);

    expect(parsePosDraft<Line, Pago, Aseguradora>(raw, NOW + POS_DRAFT_TTL_MS)).toEqual(draft());
  });

  it('stores only the customer id, never customer personal data', () => {
    const withPii = { ...draft(), cliente: { id: 'c1', docIdentidadGub: '12345678', nombreApellidos: 'Ana Pérez' } } as Draft;

    const stored = JSON.parse(serializePosDraft(withPii, NOW)) as Record<string, unknown>;

    expect(stored['clienteId']).toBe('c1');
    expect(stored['cliente']).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain('12345678');
    expect(JSON.stringify(stored)).not.toContain('Ana Pérez');
  });

  it('discards drafts older than the time to live', () => {
    const raw = serializePosDraft(draft(), NOW);

    expect(parsePosDraft(raw, NOW + POS_DRAFT_TTL_MS + 1)).toBeNull();
  });

  it('discards legacy drafts without a timestamp, which carried the whole customer', () => {
    const legacy = JSON.stringify({ cart: [], pagos: [], cliente: { id: 'c1', docIdentidadGub: '12345678' } });

    expect(parsePosDraft(legacy, NOW)).toBeNull();
  });

  it('returns null for missing or corrupt drafts', () => {
    expect(parsePosDraft(null, NOW)).toBeNull();
    expect(parsePosDraft('{not json', NOW)).toBeNull();
    expect(parsePosDraft('null', NOW)).toBeNull();
  });

  it('normalizes malformed fields to safe defaults', () => {
    const raw = JSON.stringify({ savedAt: NOW, cart: 'x', pagos: null, clienteId: 7, recetaId: 3 });

    expect(parsePosDraft(raw, NOW)).toEqual({
      cart: [],
      pagos: [],
      clienteId: null,
      recetaId: '',
      aseguradora: null,
      montoCubierto: null,
      seguroExpanded: false,
    });
  });

  it('treats a draft as empty only without cart, customer and insurer', () => {
    expect(isEmptyPosDraft(draft({ cart: [], clienteId: null, aseguradora: null }))).toBeTrue();
    expect(isEmptyPosDraft(draft({ cart: [], aseguradora: null }))).toBeFalse();
    expect(isEmptyPosDraft(draft({ cart: [], clienteId: null }))).toBeFalse();
  });
});
