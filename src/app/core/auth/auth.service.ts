import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, EMPTY } from 'rxjs';
import { environment } from '@environment/environment';

interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  empresaId?: string;
  sucursalId?: string;
  exp?: number;
}

interface LoginRequest { usuario: string; password: string; }
interface AuthResponse { accessToken: string; }

const TOKEN_KEY = 'sofia_token';
const BASE = `${environment.api.baseurl}/api/v1/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(this.loadToken());
  readonly token = this._token.asReadonly();

  private readonly _payload = computed<JwtPayload | null>(() => {
    const t = this._token();
    if (!t) return null;
    try {
      return JSON.parse(atob(t.split('.')[1])) as JwtPayload;
    } catch { return null; }
  });

  readonly isAuthenticated = computed(() => {
    const p = this._payload();
    if (!p) return false;
    return !p.exp || p.exp * 1000 > Date.now();
  });

  readonly currentUser = computed(() => this._payload());
  readonly empresaId = computed(() => this._payload()?.empresaId ?? null);

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/login`, req, { withCredentials: true }).pipe(
      tap(res => this.storeToken(res.accessToken))
    );
  }

  // Called by the interceptor on 401 — returns the new access token
  refreshAccessToken(): Observable<string> {
    return this.http.post<AuthResponse>(`${BASE}/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => this.storeToken(res.accessToken)),
      map(res => res.accessToken)
    );
  }

  logout(): void {
    // Best-effort: tell the server to revoke the refresh token cookie
    this.http.post(`${BASE}/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => EMPTY)
    ).subscribe();

    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    void this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    return (this._payload()?.roles ?? []).includes(role);
  }

  hasAnyRole(...roles: string[]): boolean {
    const userRoles = this._payload()?.roles ?? [];
    return roles.some(r => userRoles.includes(r));
  }

  storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private loadToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
}
