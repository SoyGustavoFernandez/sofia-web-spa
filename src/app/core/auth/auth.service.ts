import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, finalize, shareReplay, EMPTY, of } from 'rxjs';
import { environment } from '@environment/environment';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { clearOtherUsersStorage, clearUserStorage } from './user-storage';
import { READ_ACTION } from './route-permissions';

interface JwtPayload {
  sub: string;
  unique_name?: string;
  fullName?: string;
  nombreEmpresa?: string;
  email?: string;
  empresaId?: string;
  sucursalId?: string;
  empleadoId?: string;
  // "true" while the account must change its password before using the app
  pwd_change?: string;
  exp?: number;
}

interface LoginRequest { nombreUsuario: string; password: string; }
interface AuthResponse { accessToken: string; requiereCambioClave?: boolean; }
export interface ChangePasswordRequest { currentPassword: string; newPassword: string; }
export interface ResetPasswordRequest { nombreUsuario: string; token: string; newPassword: string; }

export interface UserPermission { modulo: string; accion: string; }
// Shape of GET /auth/me; roles come from here because the JWT role claim is not frontend-friendly
export interface UserProfile { roles: string[]; permisos: UserPermission[]; }

const TOKEN_KEY = 'sofia_token';
const BASE = `${environment.api.baseurl}/api/v1/auth`;
// The API rejects cookie-authenticated calls without it, so a cross-site form cannot rotate or end the session
export const CSRF_HEADERS = { 'X-SOFIA-CSRF': '1' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly searchState = inject(SearchStateService);

  private readonly _token = signal<string | null>(this.loadToken());
  readonly token = this._token.asReadonly();

  private readonly _payload = computed<JwtPayload | null>(() => {
    const t = this._token();
    if (!t) return null;
    try {
      const base64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder('utf-8').decode(bytes)) as JwtPayload;
    } catch { return null; }
  });

  readonly isAuthenticated = computed(() => {
    const p = this._payload();
    if (!p) return false;
    return !p.exp || p.exp * 1000 > Date.now();
  });

  readonly currentUser = computed(() => this._payload());
  readonly userId = computed(() => this._payload()?.sub ?? null);
  readonly empresaId = computed(() => this._payload()?.empresaId ?? null);
  readonly sucursalId = computed(() => this._payload()?.sucursalId ?? null);
  readonly empleadoId = computed(() => this._payload()?.empleadoId ?? null);
  readonly requiresPasswordChange = computed(() => this._payload()?.pwd_change === 'true');

  private readonly _profile = signal<UserProfile | null>(null);
  private profileLoad$: Observable<UserProfile> | null = null;

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/login`, req, { withCredentials: true }).pipe(
      tap(res => {
        this.storeToken(res.accessToken);
        // A shared POS terminal must not keep the previous cashier's drafts around
        clearOtherUsersStorage(this.userId());
      })
    );
  }

  // Dedupes concurrent refresh calls from the guard and the interceptor into one request.
  private refreshInProgress$: Observable<string> | null = null;

  // Called by the guard and the interceptor to get a fresh access token.
  refreshAccessToken(): Observable<string> {
    if (!this.refreshInProgress$) {
      this.refreshInProgress$ = this.http.post<AuthResponse>(`${BASE}/refresh`, {}, { withCredentials: true, headers: CSRF_HEADERS }).pipe(
        tap(res => this.storeToken(res.accessToken)),
        map(res => res.accessToken),
        finalize(() => { this.refreshInProgress$ = null; }),
        shareReplay(1)
      );
    }
    return this.refreshInProgress$;
  }

  // The server rotates the security stamp and revokes every session, so the caller must log in again
  changePassword(req: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/change-password`, req, { withCredentials: true });
  }

  // Anonymous and cookie-free: the API answers the same whether or not the account exists
  forgotPassword(nombreUsuario: string): Observable<void> {
    return this.http.post(`${BASE}/forgot-password`, { nombreUsuario }).pipe(map(() => undefined));
  }

  resetPassword(req: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${BASE}/reset-password`, req);
  }

  logout(): void {
    // The server revokes the session from the refresh cookie even with an expired access token; navigate once it answers
    this.http.post(`${BASE}/logout`, {}, { withCredentials: true, headers: CSRF_HEADERS }).pipe(
      catchError(() => EMPTY),
      finalize(() => void this.router.navigate(['/auth/login']))
    ).subscribe();

    // Explicit logout: the user is leaving, so their drafts and caches go too (shared pharmacy PCs)
    clearUserStorage();
    this.clearLocalSession();
  }

  // Loads roles and permissions once per user; guards and the sidebar share the same request
  loadPermissions(): Observable<UserProfile> {
    const loaded = this._profile();
    if (loaded) return of(loaded);
    if (!this.profileLoad$) {
      const requestedFor = this.userId();
      this.profileLoad$ = this.http.get<UserProfile>(`${BASE}/me`).pipe(
        // A logout or user switch during the request must not inherit the previous user's profile
        tap(profile => { if (this.userId() === requestedFor) this._profile.set(profile); }),
        finalize(() => { this.profileLoad$ = null; }),
        shareReplay(1)
      );
    }
    return this.profileLoad$;
  }

  // Mirrors the API's PermissionAuthorizationHandler: Admin bypasses and names compare case-insensitively
  hasPermission(modulo: string, accion: string = READ_ACTION): boolean {
    const profile = this._profile();
    if (!profile) return false;
    if (profile.roles.some(r => sameName(r, 'Admin'))) return true;
    return profile.permisos.some(p => sameName(p.modulo, modulo) && sameName(p.accion, accion));
  }

  storeToken(token: string): void {
    const previousUser = this.userId();
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
    if (this.userId() !== previousUser) this.resetPermissions();
  }

  // Keeps per-user storage (POS drafts survive an expired session), but drops in-memory search filters
  clearLocalSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.searchState.clearAll();
    this.resetPermissions();
  }

  private resetPermissions(): void {
    this._profile.set(null);
    this.profileLoad$ = null;
  }

  private loadToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
}

// Same rule as the API: trimmed, ordinal and case-insensitive
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
