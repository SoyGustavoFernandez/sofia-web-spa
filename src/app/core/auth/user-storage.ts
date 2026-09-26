// localStorage prefixes that hold per-user data: keys are scoped by user id and wiped on logout.
export const MENU_CACHE_PREFIX = 'sofia_menu_cache';
export const POS_DRAFT_PREFIX = 'pos-nueva-venta-draft';

const USER_SCOPED_PREFIXES = [MENU_CACHE_PREFIX, POS_DRAFT_PREFIX];

export function userStorageKey(prefix: string, userId: string | null): string {
  return `${prefix}:${userId ?? 'anonymous'}`;
}

// Also removes legacy unscoped keys (plain prefix), written before keys were per user.
export function clearUserStorage(): void {
  try {
    Object.keys(localStorage)
      .filter(key => USER_SCOPED_PREFIXES.some(prefix => key.startsWith(prefix)))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
}
