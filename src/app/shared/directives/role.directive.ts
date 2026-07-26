import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

/**
 * 📌 USO DE LA DIRECTIVA [cswAppHasRole]
 *
 * Esta directiva permite condicionar la visibilidad de elementos en la interfaz según los roles del usuario autenticado.
 * Los roles deben estar presentes en el token (ej. "Admin", "Editor", etc.) y ser accesibles desde el AuthService.
 *
 * ──────────────────────────────────────────────────────
 * 🅰️ OPCIÓN A: Uso desde el componente (TypeScript)
 *
 *  import { Component } from '@angular/core';
 *  import { AuthService } from '@core/auth/auth.service';
 *
 *  @Component({
 *    selector: 'app-panel',
 *    templateUrl: './panel.component.html'
 *  })
 *  export class PanelComponent {
 *    constructor(public authService: AuthService) {}
 *
 *    get isAdmin(): boolean {
 *      return this.authService.hasRole('Admin');
 *    }
 *
 *    get puedeEditar(): boolean {
 *      return this.authService.hasAnyRole(['Admin', 'Editor']);
 *    }
 *  }
 *
 *  Y en el HTML:
 *    <button *ngIf="isAdmin">Eliminar usuario</button>
 *    <button *ngIf="puedeEditar">Editar usuario</button>
 *
 * ──────────────────────────────────────────────────────
 * 🅱️ OPCIÓN B: Uso directo en el HTML con AuthService
 *
 *    <button *ngIf="authService.hasRole('Admin')">Eliminar usuario</button>
 *    <button *ngIf="authService.hasAnyRole(['Admin', 'Editor'])">Editar usuario</button>
 *
 * ──────────────────────────────────────────────────────
 * Alternativamente, puedes usar directamente esta directiva:
 *
 *    <div *cswAppHasRole="'Admin'">Visible solo para Admin</div>
 *    <div *cswAppHasRole="['Admin', 'Editor']">Visible para Admin o Editor</div>
 */

@Directive({
  selector: '[cswAppHasRole]'
})
export class HasRoleDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private auth = inject(AuthService);

  @Input() set cswAppHasRole(role: string | string[]) {
    const hasAccess = Array.isArray(role)
      ? this.auth.hasAnyRole(role)
      : this.auth.hasRole(role);

    this.viewContainer.clear();

    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}

