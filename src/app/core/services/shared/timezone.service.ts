import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sofia_timezone';
const DEFAULT_TZ = 'America/Lima';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  readonly timezone = signal<string>(this.resolveInitial());

  setTimezone(tz: string): void {
    this.timezone.set(tz);
    localStorage.setItem(STORAGE_KEY, tz);
  }

  private resolveInitial(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TZ;
    } catch {
      return DEFAULT_TZ;
    }
  }
}
