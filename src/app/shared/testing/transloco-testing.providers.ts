import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

/**
 * Minimal Transloco setup for component specs: no real i18n JSON files are loaded
 * (the TestingLoader resolves every lang/scope to an empty translation), so `t()`/the
 * transloco pipe just echo back the translation key instead of hitting HttpClient.
 */
export function provideTranslocoTesting(): EnvironmentProviders {
  return importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: {},
      translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
    }),
  );
}
