import { MetodoPago } from '../pos/models/venta.model';

interface Traduccion {
  [clave: string]: string | Traduccion;
}

async function load(lang: string): Promise<Traduccion> {
  const response = await fetch(`/i18n/dashboard/${lang}.json`);
  return (await response.json()) as Traduccion;
}

function claves(traduccion: Traduccion, prefijo = ''): string[] {
  return Object.entries(traduccion).flatMap(([clave, valor]) =>
    typeof valor === 'string' ? [`${prefijo}${clave}`] : claves(valor, `${prefijo}${clave}.`),
  );
}

describe('dashboard i18n', () => {
  it('has the same keys in Spanish and English', async () => {
    const [es, en] = await Promise.all([load('es'), load('en')]);

    expect(claves(en).sort()).toEqual(claves(es).sort());
  });

  it('labels every payment method in both languages', async () => {
    const metodos = Object.keys(MetodoPago).filter(clave => isNaN(Number(clave)));

    for (const lang of ['es', 'en']) {
      const metodo = (await load(lang))['metodo'] as Traduccion;
      expect(metodos.filter(m => !metodo[m])).withContext(lang).toEqual([]);
    }
  });
});
