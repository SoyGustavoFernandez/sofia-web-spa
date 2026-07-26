import type { WebEnvironment } from './environments/environment.model';

declare global {
  interface Window {
    __env?: WebEnvironment;
  }
}

export {};
