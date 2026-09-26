import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environment/environment';
import { MENU_CACHE_PREFIX, userStorageKey } from '@core/auth/user-storage';
import { MenuService } from './menu.service';

// No token in these tests, so the service caches under the anonymous user key
const CACHE_KEY = userStorageKey(MENU_CACHE_PREFIX, null);
const OTHER_USER_KEY = userStorageKey(MENU_CACHE_PREFIX, 'other-user');
const MENU_URL = `${environment.api.baseurl}/api/v1/menu`;

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(CACHE_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(OTHER_USER_KEY);
  });

  it('load() requests the menu against the configured API base URL, not a relative path', () => {
    service.load();

    const req = httpMock.expectOne(MENU_URL);
    expect(req.request.method).toBe('GET');
    req.flush({
      iconMenu: [{ id: 1, icon: 'home', route: '/dashboard', tooltip: 'Dashboard' }],
      sidebar: [{ id: 1, name: 'Administración', children: [] }],
    });

    expect(service.iconMenu().length).toBe(1);
    expect(service.sidebar().length).toBe(1);
  });

  it('load() caches the response in localStorage', () => {
    service.load();

    httpMock.expectOne(MENU_URL).flush({
      iconMenu: [],
      sidebar: [{ id: 1, name: 'Catálogos', children: [] }],
    });

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    expect(cached.sidebar[0].name).toBe('Catálogos');
  });

  it('restoreFromCache() populates signals from a previously cached menu', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ iconMenu: [], sidebar: [{ id: 1, name: 'Inventario', children: [] }] }),
    );

    service.restoreFromCache();

    expect(service.sidebar().length).toBe(1);
    expect(service.sidebar()[0].name).toBe('Inventario');
  });

  it('restoreFromCache() is a no-op when there is nothing cached', () => {
    service.restoreFromCache();

    expect(service.iconMenu()).toEqual([]);
    expect(service.sidebar()).toEqual([]);
  });

  it('restoreFromCache() does not throw on corrupted cache data', () => {
    localStorage.setItem(CACHE_KEY, 'not-json');

    expect(() => service.restoreFromCache()).not.toThrow();
    expect(service.sidebar()).toEqual([]);
  });

  it('restoreFromCache() never reuses a menu cached by another user', () => {
    localStorage.setItem(
      OTHER_USER_KEY,
      JSON.stringify({ iconMenu: [], sidebar: [{ id: 1, name: 'Administración', children: [] }] }),
    );

    service.restoreFromCache();

    expect(service.sidebar()).toEqual([]);
  });

  it('restoreFromCache() clears the in-memory menu of the previous user on a cache miss', () => {
    service.sidebar.set([{ id: 1, name: 'Administración', children: [] }]);

    service.restoreFromCache();

    expect(service.sidebar()).toEqual([]);
  });
});
