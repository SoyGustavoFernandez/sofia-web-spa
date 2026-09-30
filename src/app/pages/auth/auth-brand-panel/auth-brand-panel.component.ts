import { Component } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { environment } from '@environment/environment';

// Left brand panel of the anonymous auth pages; reuses the login styles so every page looks the same
@Component({
  selector: 'app-auth-brand-panel',
  standalone: true,
  imports: [TranslocoModule],
  templateUrl: './auth-brand-panel.component.html',
  styleUrls: ['../login/login.component.scss'],
  styles: [':host { display: contents; }'],
})
export class AuthBrandPanelComponent {
  readonly appVersion = environment.appVersion;
  readonly currentYear = new Date().getFullYear();
}
