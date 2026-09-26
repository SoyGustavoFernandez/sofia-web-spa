import { MENU_CACHE_PREFIX, POS_DRAFT_PREFIX, clearUserStorage, userStorageKey } from './user-storage';

describe('user-storage', () => {
  const unrelatedKey = 'selectedMenu';

  afterEach(() => {
    localStorage.removeItem(POS_DRAFT_PREFIX);
    localStorage.removeItem(`${userStorageKey(POS_DRAFT_PREFIX, 'u1')}-venta-9`);
    localStorage.removeItem(userStorageKey(MENU_CACHE_PREFIX, 'u2'));
    localStorage.removeItem(unrelatedKey);
  });

  it('userStorageKey() scopes the prefix by user id and falls back to anonymous', () => {
    expect(userStorageKey(POS_DRAFT_PREFIX, 'u1')).toBe('pos-nueva-venta-draft:u1');
    expect(userStorageKey(MENU_CACHE_PREFIX, null)).toBe('sofia_menu_cache:anonymous');
  });

  it('clearUserStorage() removes scoped, per-venta and legacy unscoped keys of every user', () => {
    localStorage.setItem(POS_DRAFT_PREFIX, '{}');
    localStorage.setItem(`${userStorageKey(POS_DRAFT_PREFIX, 'u1')}-venta-9`, '{}');
    localStorage.setItem(userStorageKey(MENU_CACHE_PREFIX, 'u2'), '{}');
    localStorage.setItem(unrelatedKey, '3');

    clearUserStorage();

    expect(localStorage.getItem(POS_DRAFT_PREFIX)).toBeNull();
    expect(localStorage.getItem(`${userStorageKey(POS_DRAFT_PREFIX, 'u1')}-venta-9`)).toBeNull();
    expect(localStorage.getItem(userStorageKey(MENU_CACHE_PREFIX, 'u2'))).toBeNull();
    expect(localStorage.getItem(unrelatedKey)).toBe('3');
  });
});
