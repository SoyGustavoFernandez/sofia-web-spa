import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [RouterModule],
  template: `
    <a [routerLink]="['/']" class="branding-link">
      <span class="branding-icon">⚕</span>
      <span class="branding-text">SOFIA</span>
    </a>
  `,
  styles: [`
    .branding-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      padding: 12px 16px;
    }

    .branding-icon {
      font-size: 1.75rem;
      line-height: 1;
      color: var(--mat-sys-primary, #1976d2);
      flex-shrink: 0;
    }

    .branding-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #041033;
      white-space: nowrap;
    }
  `],
})
export class BrandingComponent {}
