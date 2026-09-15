import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ViewChild, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { MatNavList } from '@angular/material/list';
import { CoreService } from '@matdash/services/core.service';
import { AppSettings } from '@matdash/config';
import { filter } from 'rxjs/operators';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavService } from '@matdash/services/nav.service';
import { MaterialModule } from '@shared/material.module';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HeaderComponent as AppHorizontalHeaderComponent } from './horizontal/header/header.component';
import { AppHorizontalSidebarComponent } from './horizontal/sidebar/sidebar.component';
import { AppBreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { CustomizerComponent } from './shared/customizer/customizer.component';
import { SidebarComponent } from './vertical/sidebar/sidebar.component';
import { HeaderComponent } from './vertical/header/header.component';
import { CSLoadingBarComponent } from '@shared/components/loading-bar/loading-bar.component';

const MOBILE_VIEW = 'screen and (max-width: 1023px)';

@Component({
  selector: 'app-full',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    AppHorizontalHeaderComponent,
    AppHorizontalSidebarComponent,
    AppBreadcrumbComponent,
    SidebarComponent,
    HeaderComponent,
    CSLoadingBarComponent,
  ],
  templateUrl: './full.component.html',
  styleUrls: [],
  encapsulation: ViewEncapsulation.None,
})
export class FullComponent implements OnInit, OnDestroy {
  @ViewChild('leftsidenav') public sidenav?: MatSidenav;
  @ViewChild('content', { static: true }) content!: MatSidenavContent;

  onToggleMobileNav(): void {
    this.sidenav?.toggle();
  }

  resView = false;
  options = this.settings.getOptions();
  private layoutChangesSubscription = Subscription.EMPTY;
  private optionsSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private htmlElement!: HTMLHtmlElement;

  constructor(
    private settings: CoreService,
    private mediaMatcher: BreakpointObserver,
    private router: Router,
    private navService: NavService
  ) {
    this.htmlElement = document.querySelector('html')!;
    this.layoutChangesSubscription = this.mediaMatcher
      .observe([MOBILE_VIEW])
      .subscribe((state) => {
        this.isMobileScreen = state.breakpoints[MOBILE_VIEW];
        this.resView = this.isMobileScreen;
      });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobileScreen && this.sidenav) {
          this.sidenav.close();
        }
      });
  }

  ngOnInit(): void {
    this.optionsSubscription = this.settings.notify.subscribe((options) => {
      this.receiveOptions(options);
    });
  }

  ngOnDestroy(): void {
    this.layoutChangesSubscription.unsubscribe();
    this.optionsSubscription.unsubscribe();
  }

  toggleCollapsed() {
    this.settings.setOptions({
      sidenavCollapsed: !this.options.sidenavCollapsed,
    });
  }

  onSidenavClosedStart() {
    this.settings.setOptions({ sidenavOpened: false });
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.settings.setOptions({ sidenavOpened: isOpened });
  }

  receiveOptions(options: AppSettings): void {
    this.options = options;
  }
}
