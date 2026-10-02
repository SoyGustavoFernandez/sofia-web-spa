import { Directive, TemplateRef, ViewContainerRef, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { routeModule } from '@core/auth/route-permissions';

// Renders its template only when the user holds the permission: 'Accion' (module of the current route) or 'Modulo:Accion'
@Directive({
  selector: '[appPermiso]',
  standalone: true,
})
export class PermisoDirective {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly appPermiso = input.required<string>();

  // Fails closed: an unmapped route without an explicit module grants nothing
  private readonly allowed = computed(() => {
    const [first, second] = this.appPermiso().split(':').map(part => part.trim());
    const modulo = second ? first : routeModule(this.router.url);
    const accion = second || first;
    return !!modulo && !!accion && this.auth.hasPermission(modulo, accion);
  });

  constructor() {
    effect(() => {
      if (!this.allowed()) this.viewContainer.clear();
      else if (this.viewContainer.length === 0) this.viewContainer.createEmbeddedView(this.templateRef);
    });
  }
}
