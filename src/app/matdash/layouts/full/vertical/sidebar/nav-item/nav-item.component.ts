import {
  Component,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  effect,
  signal,
  untracked,
} from '@angular/core';
import { NavItem } from './nav-item';
import { Router, RouterLink } from '@angular/router';
import { NavService } from '../../../../../services/nav.service';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { TranslocoModule } from '@jsverse/transloco';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '@shared/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-item',
  imports: [TranslocoModule, TablerIconsModule, MaterialModule, CommonModule, RouterLink],
  templateUrl: './nav-item.component.html',
  styleUrls: [],
  animations: [
    trigger('indicatorRotate', [
      state('collapsed', style({ transform: 'rotate(0deg)' })),
      state('expanded', style({ transform: 'rotate(180deg)' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4,0.0,0.2,1)')
      ),
    ]),
  ],
})
export class AppNavItemComponent {
  @Output() toggleMobileLink = new EventEmitter<void>();
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() selectedIcon!: string;
  // Signal-based: el template usa `expanded()` para que Angular re-renderice
  // los hijos cuando cambia. Antes era un campo plano, así que un effect()
  // que lo modificaba no disparaba change detection sobre `@if (expanded)`.
  expanded = signal(false);
  disabled = false;
  twoLines = false;
  @HostBinding('attr.aria-expanded') get ariaExpanded() { return this.expanded(); }
  @Input() item!: NavItem;
  @Input() depth = 0;

  constructor(
    public navService: NavService,
    public router: Router,
  ) {
    // Antes: ngOnChanges → solo se disparaba al cambiar @Input (item, selectedIcon).
    // Bug: al cambiar la URL (router.navigate), el árbol del vertical sidebar no se
    // re-evaluaba, así que un grupo "Documentación" no expandía su sub-árbol
    // "Importación" cuando la URL cambiaba a /operation-module/imports/*.
    //
    // Ahora: effect() sobre currentUrl() → re-evalúa automáticamente el flag
    // `expanded` cada vez que el router emite NavigationEnd. Esto conecta el
    // vertical sidebar con la URL activa (fix del defecto 3) y mantiene
    // coherencia con el horizontal (que también se basa en currentUrl).
    //
    // El expanded se activa cuando:
    // 1) el propio item tiene route y la URL es prefijo de su route, O
    // 2) un descendiente (recursivo) tiene route que matchea por prefijo la URL.
    // Esto cubre el caso "Importación" (route='') que debe expandirse cuando
    // un hijo como "Documentos" (route='/operation-module/imports') está activo.
    //
    // IMPORTANTE: este effect SOLO debe re-ejecutarse cuando cambia
    // `currentUrl()`. Si leyéramos `this.expanded()` adentro, el effect se
    // auto-registraría como dependencia de `expanded` y entraría en un loop:
    // user hace click en padre con children → expanded.set(true) → effect
    // re-evalúa → next=false (porque la URL no es prefijo del padre) →
    // expanded.set(false) → el template NUNCA llega a renderizar los hijos.
    // Usamos `untracked()` para leer `expanded()` sin registrar la dep.
    effect(() => {
      const url = this.navService.currentUrl();
      if (!this.item || !url) return;
      if (!this.hasChildren()) return;
      const next = this.urlMatchesThisOrDescendant(url);
      untracked(() => {
        if (this.expanded() !== next) {
          this.expanded.set(next);
        }
      });
    });
  }

  private hasChildren(): boolean {
    return !!this.item?.children && this.item.children.length > 0;
  }

  /**
   * True si la URL coincide con la ruta del item o con la de cualquier
   * descendiente (recursivo, prefix match). Usado por el effect para decidir
   * si el sub-árbol debe estar expandido.
   */
  private urlMatchesThisOrDescendant(url: string): boolean {
    if (!this.item) return false;
    if (this.item.route && this.item.route.length > 0) {
      const normalized = this.item.route.startsWith('/') ? this.item.route : `/${this.item.route}`;
      if (url === normalized || url.startsWith(`${normalized}/`)) return true;
    }
    return (this.item.children ?? []).some(c => this.urlMatchesDescendant(c, url));
  }

  private urlMatchesDescendant(node: NavItem, url: string): boolean {
    if (!node) return false;
    if (node.route && node.route.length > 0) {
      const normalized = node.route.startsWith('/') ? node.route : `/${node.route}`;
      if (url === normalized || url.startsWith(`${normalized}/`)) return true;
    }
    return (node.children ?? []).some(c => this.urlMatchesDescendant(c, url));
  }

  onItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
    }
    if (item.children && item.children.length) {
      this.expanded.set(!this.expanded());
    }
    //scroll
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    if (!this.expanded()) {
      if (window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  onSubItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      if (this.expanded() && window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  isDirectlyActive(item: NavItem): boolean {
    return !!item.route && this.router.isActive(item.route, true);
  }

  isChildActive(item: NavItem): boolean {
    if (!item.children) return false;
    return item.children.some(
      (child) => this.isDirectlyActive(child) || this.isChildActive(child)
    );
  }

  onItemClicked(event: MouseEvent, item: NavItem) {
    // Middle click (button 1) or Ctrl+Click - open in new tab
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (item.route) {
        window.open(item.route, '_blank');
      }
      return;
    }

    // Regular left click (button 0)
    if (event.button === 0) {
      // Si el item tiene hijos (group-selector / sub-caption), NO debe
      // navegar a su `item.route` cuando se hace click — debe expandir/
      // colapsar el sub-árbol. Sin preventDefault, el <a mat-list-item
      // [routerLink]> ejecuta la navegación por defecto, currentUrl
      // cambia, el effect() del padre re-evalúa expanded y lo resetea a
      // false antes de que el template pueda pintar los hijos. Ese era
      // el defecto 1 del mobile: click en Importación → navegar a '/'
      // → effect resetea expanded → no se ven los hijos.
      if (this.hasChildren()) {
        event.preventDefault();
      }
      this.onItemSelected(item);
    }
  }
}
