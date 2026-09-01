import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [RouterModule],
  template: `
    <a [routerLink]="['/']" class="branding-link">
      <img src="/images/logos/logo.svg" class="align-middle m-2" alt="SOFIA" style="height: 40px;" />
    </a>
  `,
  styles: [`
    .branding-link {
      display: flex;
      align-items: center;
      text-decoration: none;
      padding: 12px 16px;
    }
  `],
})
export class BrandingComponent {}
