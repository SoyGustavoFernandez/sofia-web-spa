import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  Router,
  NavigationEnd,
  ActivatedRoute,
  Data,
  RouterModule,
} from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterModule, TranslocoModule, CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class AppBreadcrumbComponent {
  pageInfo: Data = Object.create(null);
  myurl: string[] = this.router.url.slice(1).split('/');

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly titleService: Title,
    private readonly translocoService: TranslocoService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .pipe(map(() => this.activatedRoute))
      .pipe(
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .pipe(filter(route => route.outlet === 'primary'))
      .pipe(mergeMap(route => route.data))
      // tslint:disable-next-line - Disables all
      .subscribe(event => {
        // tslint:disable-next-line - Disables all
        this.pageInfo = event;
      });
  }

  navigateTo(url: string): void {
    if (url && url !== this.router.url) {
      this.router.navigateByUrl(url);
    }
  }
}
