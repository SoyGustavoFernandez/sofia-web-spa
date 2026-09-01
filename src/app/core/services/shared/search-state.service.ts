import { Injectable } from '@angular/core';

export interface SearchPageState {
  formValues: Record<string, unknown>;
  pageIndex: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  private readonly states = new Map<string, SearchPageState>();

  save(key: string, state: SearchPageState): void {
    this.states.set(key, state);
  }

  restore(key: string): SearchPageState | null {
    return this.states.get(key) ?? null;
  }

  clear(key: string): void {
    this.states.delete(key);
  }
}
