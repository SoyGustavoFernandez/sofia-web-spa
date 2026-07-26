import { Component, Output, EventEmitter, OnInit, inject, effect } from '@angular/core';
import { CoreService } from '@matdash/services/core.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatListItem, MatNavList } from '@angular/material/list';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuService } from '@core/services/security/menu.service';
import { CommonModule } from '@angular/common';
import { IconMenuItem, SidebarChild, SidebarGroup } from '@core/services/security/menu.service';
import { NavService } from '../../../../../services/nav.service';

@Component({
  selector: 'app-iconmenu',
  standalone: true,
  templateUrl: './iconmenu.component.html',
  imports: [
    TablerIconsModule,
    MatListItem,
    MatNavList,
    MatButtonModule,
    MatTooltipModule,
    CommonModule,
  ],
})
export class IconMenuComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settings = inject(CoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navService = inject(NavService);

  options = this.settings.getOptions();

  /** Signals: ¡OJO! se usan como funciones en el template: iconMenu() */
  iconMenu = this.menuService.iconMenu;
  sidebar = this.menuService.sidebar;

  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() openClosedMenu = new EventEmitter<void>();
  @Output() iconSelected = new EventEmitter<number>();

  selectedMenu: number | null = null;

  selectIcon(iconId: number) {
    this.iconSelected.emit(iconId);
    this.selectedMenu = iconId;
    localStorage.setItem('selectedMenu', iconId.toString());
    // Compatibilidad: algunos componentes del vertical (no este) leen
    // `selectedIcon` de localStorage directamente. Mantener ambas claves
    // sincronizadas para evitar drift.
    localStorage.setItem('selectedIcon', iconId.toString());
  }

  private isVisibleIcon(iconId: number | null): boolean {
    return iconId !== null && this.iconMenu().some(item => item.id === iconId);
  }

  private getStoredIcon(): number | null {
    const storedIcon = localStorage.getItem('selectedMenu') ?? localStorage.getItem('selectedIcon');
    if (!storedIcon) return null;

    const parsedIcon = Number.parseInt(storedIcon, 10);
    return Number.isNaN(parsedIcon) ? null : parsedIcon;
  }

  private selectFirstVisibleIcon(): void {
    const firstIcon = this.iconMenu()[0];
    if (firstIcon) {
      this.selectIcon(firstIcon.id);
      return;
    }

    this.selectedMenu = null;
    localStorage.removeItem('selectedMenu');
  }

  private syncSelectedIconWithMenu(): void {
    const storedIcon = this.getStoredIcon();
    if (this.isVisibleIcon(storedIcon)) {
      this.selectIcon(storedIcon!);
      return;
    }

    const url = this.navService.currentUrl() ?? this.router.url;
    const routeIcon = this.findParentRouteId(this.sidebar(), url);
    if (this.isVisibleIcon(routeIcon)) {
      this.selectIcon(routeIcon!);
      return;
    }

    this.selectFirstVisibleIcon();
  }

  /**
   * Busca el id del grupo padre para pintar seleccionado según la URL actual.
   * Match por prefijo (no exacto): si la URL es `/operation-module/imports/search`
   * y el item tiene `route='/operation-module/imports'`, el grupo padre debe
   * quedar resaltado. Coincide con la convención del BE (cada `route` es el
   * path base del feature, no la ruta completa de cada sub-página).
   */
  private findParentRouteId(groups: SidebarGroup[], url: string): number | null {
    for (const g of groups) {
      if (!g?.children) continue;
      for (const c of g.children) {
        if (c?.route && this.routeMatchesPrefix(url, c.route)) return g.id;
        if (Array.isArray(c?.children)) {
          const hit = c.children.find((cc: SidebarChild) =>
            cc?.route && this.routeMatchesPrefix(url, cc.route),
          );
          if (hit) return g.id;
        }
      }
    }
    return null;
  }

  private routeMatchesPrefix(url: string, route: string): boolean {
    const normalized = route.startsWith('/') ? route : `/${route}`;
    return url === normalized || url.startsWith(`${normalized}/`);
  }

  ngOnInit(): void {
    // Intenta cache primero
    this.menuService.restoreFromCache();
    // Si no hay cache, trae al vuelo
    (async () => {
      if (this.iconMenu().length === 0) {
        await this.menuService.load();
      }
      this.syncSelectedIconWithMenu();
    })();
  }

  constructor() {
    // Re-sincroniza el icono activo cada vez que cambia la URL. Antes esto
    // solo pasaba en ngOnInit, así que al cambiar de ruta (sin recargar el
    // iconmenu) el icono lateral quedaba stale. Esto es parte del fix del
    // defecto 3: el iconmenu lateral y el vertical sidebar deben reflejar
    // la URL activa sin importar cuándo se monten.
    //
    // El effect depende de `navService.currentUrl()` (signal) para dispararse
    // en cada NavigationEnd. Se suscribe también a `iconMenu()` y `sidebar()`
    // para sincronizar cuando el menú termina de cargar.
    effect(() => {
      const url = this.navService.currentUrl() ?? this.router.url;
      // Leer ambos signals para que el effect se re-ejecute cuando cambien.
      const groups = this.sidebar();
      const icons = this.iconMenu();
      if (icons.length === 0) return;
      const routeIcon = this.findParentRouteId(groups, url);
      if (routeIcon !== null && this.isVisibleIcon(routeIcon) && this.selectedMenu !== routeIcon) {
        this.selectIcon(routeIcon);
      }
    });
  }

  onKeyDown(event: KeyboardEvent, item: IconMenuItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.selectIcon(item.id);
      event.preventDefault();
    }
  }
}
