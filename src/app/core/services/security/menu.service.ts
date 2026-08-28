import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

const CACHE_KEY = 'sofia_menu_cache';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  readonly iconMenu = signal<IconMenuItem[]>([]);
  readonly sidebar = signal<SidebarGroup[]>([]);

  restoreFromCache(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { iconMenu: IconMenuItem[]; sidebar: SidebarGroup[] };
        this.iconMenu.set(data.iconMenu ?? []);
        this.sidebar.set(data.sidebar ?? []);
      }
    } catch { /* ignore */ }
  }

  load(): void {
    this.http.get<{ iconMenu: IconMenuItem[]; sidebar: SidebarGroup[] }>('/api/v1/menu').subscribe({
      next: data => {
        this.iconMenu.set(data.iconMenu ?? []);
        this.sidebar.set(data.sidebar ?? []);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      },
    });
  }
}
