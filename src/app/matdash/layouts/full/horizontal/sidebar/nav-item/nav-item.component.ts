import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { NavService } from '@matdash/services/nav.service';
import { NavItem } from '../../../vertical/sidebar/nav-item/nav-item';

@Component({
  selector: 'app-horizontal-nav-item',
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './nav-item.component.html',
  host: {
    '[class.parentBox]': 'true',
    '[class.mega-menu]': "item?.ddType === 'mega-menu'",
    '[class.two-column]': "item?.ddType === 'two-column'",
    '[class.pactive]': 'isItemActive()',
    '[class.ddmenu]': 'depth > 0',
  },
})
export class AppHorizontalNavItemComponent {
  @Input() depth = 0;
  @Input() item!: NavItem;

  private readonly navService = inject(NavService);

  /**
   * Item con ruta navegable real (truthy y no vacía). El BE devuelve `route=''`
   * en items padre de submenú (Importación / Exportación) — eso NO es link,
   * es un selector de grupo. Cualquier string vacío o null se considera
   * "no link".
   */
  hasNavigableLink(): boolean {
    return !!this.item?.route && this.item.route.length > 0;
  }

  /**
   * True si el item tiene sub-items (children no vacíos). Usado para
   * distinguir entre link directo puro (sin dropdown) y L0 con un sub-ítem
   * (group-selector con dropdown).
   */
  hasChildren(): boolean {
    return !!this.item?.children && this.item.children.length > 0;
  }

  /**
   * True si la URL actual coincide EXACTAMENTE con la ruta del item (no
   * con descendientes). Solo el item clickeado queda activo; los padres
   * y captions no se pintan como rastro de navegación.
   *
   * Comportamiento:
   * - Item con route y SIN children (link directo puro, hoja terminal):
   *   activo si URL === route o URL empieza con `route/`. Se pinta con
   *   fondo azul sólido (`pactive`).
   * - Item con route PERO CON children (L0 con 1 sub-ítem, ej. Dashboard,
   *   Tesorería, Tarifa): retorna false. El "azul sólido" lo recibe el
   *   sub-ítem (que sí es hoja terminal) cuando se navega; el L0 se pinta
   *   con la franja azul (`menuLink--ancestor`) para que su apariencia sea
   *   consistente con los demás L0 con descendientes.
   * - Item sin route (caption, group-selector): nunca activo.
   * - navCap: nunca activo.
   */
  isItemActive(): boolean {
    if (!this.item) return false;
    if (this.item.navCap) return false;
    if (!this.hasNavigableLink()) return false;
    // Si el item tiene hijos, no se pinta como "clickeado" (azul sólido).
    // El sub-ítem es el que recibe la marca. Esto unifica el aspecto visual
    // de los L0 con 1 hijo (Dashboard, Tesorería) con el de los L0 con
    // varios hijos (PDA, Documentación).
    if (this.hasChildren()) return false;
    const url = this.navService.currentUrl();
    if (!url) return false;
    const route = this.item.route as string;
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    return url === normalizedRoute || url.startsWith(`${normalizedRoute}/`);
  }

  /**
   * True si la URL actual coincide con la ruta de **algún descendiente**
   * (recursivo), pero NO con la del item actual. Se usa para dar una marca
   * visual sutil al padre/caption L0 cuando un hijo está activo — sin
   * pintar el item clickeado (eso lo maneja `isItemActive()`).
   *
   * Caso típico: estoy en `/operation-module/imports/search` (hijo de
   * "Documentación" → "Importación" → "Documentos"). Entonces:
   *   - `isItemActive()` en "Documentos" → true (azul sólido).
   *   - `isItemActive()` en "Importación" (group-selector sin route) → false.
   *   - `isParentOfActive()` en "Importación" → true (marca sutil).
   *   - `isItemActive()` en "Documentación" (group-selector sin route) → false.
   *   - `isParentOfActive()` en "Documentación" → true (marca sutil).
   *
   * Aplica a TODO item CON children, sin importar si tiene route propia.
   *   - L0 con 1 hoja (Dashboard): isItemActive=false, isParentOfActive=true
   *     cuando la URL es /dashboard (porque su único hijo coincide).
   *   - L0 con varios hijos (PDA, Documentación): mismo caso.
   *   - L0 sin children: isParentOfActive=false (no tiene qué matchear).
   */
  isParentOfActive(): boolean {
    if (!this.item) return false;
    if (this.item.navCap) return false;
    // Solo aplica a items CON children. Si no tiene, el `isItemActive()`
    // ya cubre el caso (link directo puro).
    if (!this.hasChildren()) return false;
    const url = this.navService.currentUrl();
    if (!url) return false;
    return this.hasDescendantMatching(this.item, url);
  }

  private hasDescendantMatching(node: NavItem, url: string): boolean {
    const children = node.children ?? [];
    for (const child of children) {
      if (child.navCap) continue;
      if (child.route && child.route.length > 0) {
        const normalized = child.route.startsWith('/') ? child.route : `/${child.route}`;
        if (url === normalized || url.startsWith(`${normalized}/`)) return true;
      }
      if (this.hasDescendantMatching(child, url)) return true;
    }
    return false;
  }
}
