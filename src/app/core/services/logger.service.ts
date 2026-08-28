import { Injectable, isDevMode } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  log(...args: unknown[]): void {
    if (isDevMode()) console.log(...args);
  }

  info(...args: unknown[]): void {
    if (isDevMode()) console.info(...args);
  }

  warn(...args: unknown[]): void {
    if (isDevMode()) console.warn(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }
}
