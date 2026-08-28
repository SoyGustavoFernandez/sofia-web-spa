import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  empresaId?: string;
  sucursalId?: string;
  exp?: number;
}

interface LoginRequest { usuario: string; password: string; }
interface LoginResponse { token: string; }

const TOKEN_KEY = 'sofia_token';

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

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', req).pipe(
      tap(res => this.storeToken(res.token))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    const roles = this._payload()?.roles ?? [];
    return roles.includes(role);
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
