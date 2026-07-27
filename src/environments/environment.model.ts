export interface WebEnvironment {
  production: boolean;
  appVersion: string;
  api: {
    baseurl: string;
  };
}

function isWebEnvironment(value: unknown): value is WebEnvironment {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const env = value as WebEnvironment;
  return (
    typeof env.production === 'boolean' &&
    typeof env.api?.baseurl === 'string' &&
    env.api.baseurl.length > 0
  );
}

/** Runtime config from /environment.js wins when present; otherwise compiled defaults. */
export function resolveEnvironment(builtIn: WebEnvironment): WebEnvironment {
  if (typeof window === 'undefined') {
    return builtIn;
  }
  const runtime = window.__env;
  if (runtime && isWebEnvironment(runtime)) {
    return runtime;
  }
  return builtIn;
}


