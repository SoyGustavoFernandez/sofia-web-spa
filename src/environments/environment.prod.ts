import { resolveEnvironment } from './environment.model';

export const builtInEnvironment = {
  production: true,
  appVersion: '1.0.0',
  api: {
    baseurl: '',
  },
};

export const environment = resolveEnvironment(builtInEnvironment);
