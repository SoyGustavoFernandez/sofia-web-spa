import { resolveEnvironment } from './environment.model';

export const builtInEnvironment = {
  production: false,
  appVersion: '1.0.0',
  api: {
    baseurl: 'https://localhost:7249',
  },
};

export const environment = resolveEnvironment(builtInEnvironment);
