import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  signal,
  computed,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CoreService } from '@matdash/services/core.service';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from '@shared/material.module';
import { AppSettings } from '@matdash/config';
import { environment } from '@environment/environment';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core/auth/auth.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

interface LanguageOption {
  language: string;
  code: string;
  icon: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    TablerIconsModule,
    MaterialModule,
    TranslocoModule,
    DatePipe,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleMobileFilterNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  private readonly settings = inject(CoreService);
  private readonly transloco = inject(TranslocoService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  options: AppSettings;
  appVersion = environment.appVersion;
  readonly currentDate = new Date();

  readonly languages: LanguageOption[] = [
    { language: 'Español', code: 'es', icon: '/images/flag/icon-flag-es.svg' },
    { language: 'English', code: 'en', icon: '/images/flag/icon-flag-en.svg' },
  ];

  readonly selectedLanguage = signal<LanguageOption>(
    this.languages.find(l => l.code === this.transloco.getActiveLang()) ?? this.languages[0]
  );

  readonly displayName = computed(() => {
    const u = this.auth.currentUser();
    return u?.fullName?.trim() || u?.unique_name || u?.sub || '—';
  });
  readonly companyName = computed(() => this.auth.currentUser()?.nombreEmpresa || '—');

  constructor() {
    this.options = this.settings.getOptions();
  }

  changeLang(lang: LanguageOption): void {
    if (lang.code === this.selectedLanguage().code) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('CONFIRMATION.CHANGE_LANGUAGE_TITLE'),
        message: this.transloco.translate('CONFIRMATION.CHANGE_LANGUAGE_MESSAGE'),
      },
      width: '400px',
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.transloco.setActiveLang(lang.code);
        this.selectedLanguage.set(lang);
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
