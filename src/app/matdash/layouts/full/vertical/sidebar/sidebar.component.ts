import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslocoService } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { routeModule } from '@core/auth/route-permissions';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { AppNavItemComponent } from './nav-item/nav-item.component';
import { BrandingComponent } from './branding.component';
import { navItems } from './sidebar-data';
import { visibleNavItems } from './visible-nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [TablerIconsModule, MaterialModule, NgScrollbarModule, RouterModule, AppNavItemComponent, BrandingComponent],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  // Recomputes once permissions arrive; routes without a mapped module (dashboard) are always shown
  readonly navItems = computed(() =>
    visibleNavItems(navItems, route => {
      const modulo = routeModule(route);
      return !modulo || this.auth.hasPermission(modulo);
    }),
  );

  constructor() {
    const notifier = inject(ErrorNotifierService);
    const transloco = inject(TranslocoService);
    this.auth.loadPermissions().subscribe({
      error: () =>
        transloco.selectTranslate('errors.permissionsLoad').pipe(take(1)).subscribe(message => notifier.showError(message)),
    });
  }
}
