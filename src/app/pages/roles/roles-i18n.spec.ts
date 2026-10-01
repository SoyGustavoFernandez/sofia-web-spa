import { ROUTE_PERMISSIONS } from '@core/auth/route-permissions';

interface RolesTranslation {
  permisos: { modulo: Record<string, string>; accion: Record<string, string> };
}

async function load(lang: string): Promise<RolesTranslation> {
  const response = await fetch(`/i18n/roles/${lang}.json`);
  return (await response.json()) as RolesTranslation;
}

describe('roles i18n — permission labels', () => {
  it('labels the module behind every screen in both languages', async () => {
    const modulos = [...new Set(Object.values(ROUTE_PERMISSIONS))];

    for (const lang of ['es', 'en']) {
      const { permisos } = await load(lang);
      expect(modulos.filter(m => !permisos.modulo[m])).withContext(lang).toEqual([]);
    }
  });

  it('translates the same modules and actions in Spanish and English', async () => {
    const [es, en] = await Promise.all([load('es'), load('en')]);

    expect(Object.keys(en.permisos.modulo)).toEqual(Object.keys(es.permisos.modulo));
    expect(Object.keys(en.permisos.accion)).toEqual(Object.keys(es.permisos.accion));
  });
});
