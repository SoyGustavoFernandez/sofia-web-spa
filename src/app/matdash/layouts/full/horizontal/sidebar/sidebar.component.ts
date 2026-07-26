import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  signal,
  inject,
} from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { AppHorizontalNavItemComponent } from './nav-item/nav-item.component';
import { CommonModule } from '@angular/common';
import { NavItem } from '../../vertical/sidebar/nav-item/nav-item';
import { navItems } from './sidebar-data';

@Component({
  selector: 'app-horizontal-sidebar',
  standalone: true,
  imports: [AppHorizontalNavItemComponent, CommonModule],
  templateUrl: './sidebar.component.html',
})
export class AppHorizontalSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly navItems = signal<NavItem[]>(navItems);
  readonly visibleItems = signal<NavItem[]>(navItems);
  readonly overflowItems = signal<NavItem[]>([]);

  mobileQuery: MediaQueryList;
  private resizeObserver?: ResizeObserver;

  constructor(
    private media: MediaMatcher,
    private el: ElementRef
  ) {
    this.mobileQuery = this.media.matchMedia('(min-width: 1100px)');
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateOverflow();
      });
      this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private calculateOverflow(): void {
    this.visibleItems.set(navItems);
    this.overflowItems.set([]);
  }
}