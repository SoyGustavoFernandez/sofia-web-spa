import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { AuthService } from '@core/auth/auth.service';
import { MENU_CACHE_PREFIX, userStorageKey } from '@core/auth/user-storage';

export interface IconMenuItem {
  id: number;
  icon: string;
  route: string;
  tooltip: string;
}

export interface SidebarChild {
  displayName?: string;
  navCap?: string;
  iconName?: string;
  route?: string;
  chip?: string;
  chipClass?: string;
  children?: SidebarChild[];
}

export interface SidebarGroup {
  id: number;
  name: string;
  children: SidebarChild[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly iconMenu = signal<IconMenuItem[]>([]);
  readonly sidebar = signal<SidebarGroup[]>([]);

  // Menu depends on the user's roles, so the cache is per user and a miss clears the previous user's menu
  restoreFromCache(): void {
    this.iconMenu.set([]);
    this.sidebar.set([]);
    try {
      const raw = localStorage.getItem(this.cacheKey());
      if (raw) {
        const data = JSON.parse(raw) as { iconMenu: IconMenuItem[]; sidebar: SidebarGroup[] };
        this.iconMenu.set(data.iconMenu ?? []);
        this.sidebar.set(data.sidebar ?? []);
      }
    } catch { /* ignore */ }
  }

  load(): void {
    this.http.get<{ iconMenu: IconMenuItem[]; sidebar: SidebarGroup[] }>(`${environment.api.baseurl}/api/v1/menu`).subscribe({
      next: data => {
        this.iconMenu.set(data.iconMenu ?? []);
        this.sidebar.set(data.sidebar ?? []);
        try { localStorage.setItem(this.cacheKey(), JSON.stringify(data)); } catch { /* ignore */ }
      },
    });
  }

  private cacheKey(): string {
    return userStorageKey(MENU_CACHE_PREFIX, this.auth.userId());
  }
}
