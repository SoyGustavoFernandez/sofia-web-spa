import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BrandingComponent } from './branding.component';
// eslint-disable-next-line deprecation/deprecation
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '@shared/material.module';

@Component({
  selector: 'app-sidebar',
  // eslint-disable-next-line deprecation/deprecation
  imports: [BrandingComponent, TablerIconsModule, MaterialModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  constructor() {}
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();
}
