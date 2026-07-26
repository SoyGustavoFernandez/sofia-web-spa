import { Component } from '@angular/core';
import { CoreService } from '@matdash/services/core.service';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  template: `
    <a [routerLink]="['/']" style="display: flex; align-items: center; gap: 10px; text-decoration: none; padding: 12px 16px;">
      <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
        S
      </div>
      <span style="font-size: 22px; font-weight: 800; tracking-wide: 1px; color: #0f172a; font-family: 'Manrope', sans-serif;">
        SOFIA
      </span>
    </a>
  `,
})
export class BrandingComponent {
  options = this.settings.getOptions();
  constructor(private settings: CoreService) {}
}
