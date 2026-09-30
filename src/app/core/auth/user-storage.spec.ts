import { MENU_CACHE_PREFIX, POS_DRAFT_PREFIX, clearOtherUsersStorage, clearUserStorage, userStorageKey } from './user-storage';

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

  it("clearOtherUsersStorage() keeps the given user's keys and removes other users' and legacy keys", () => {
    const own = userStorageKey(POS_DRAFT_PREFIX, 'u1');
    const ownVenta = `${own}-venta-9`;
    const other = userStorageKey(POS_DRAFT_PREFIX, 'u2');
    const otherVenta = `${other}-venta-3`;
    [own, ownVenta, other, otherVenta, POS_DRAFT_PREFIX, unrelatedKey].forEach(key => localStorage.setItem(key, '{}'));

    clearOtherUsersStorage('u1');

    expect(localStorage.getItem(own)).not.toBeNull();
    expect(localStorage.getItem(ownVenta)).not.toBeNull();
    expect(localStorage.getItem(other)).toBeNull();
    expect(localStorage.getItem(otherVenta)).toBeNull();
    expect(localStorage.getItem(POS_DRAFT_PREFIX)).toBeNull();
    expect(localStorage.getItem(unrelatedKey)).toBe('{}');
    [own, ownVenta].forEach(key => localStorage.removeItem(key));
  });
});
