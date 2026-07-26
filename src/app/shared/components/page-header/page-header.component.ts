import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  isActive?: boolean;
}

@Component({
  selector: 'csw-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  imports: [CommonModule, TranslocoModule, MaterialModule],
  standalone: true,
})
export class PageHeaderComponent {
  @Input() title!: string;
  @Input() breadcrumbItems: BreadcrumbItem[] = [];
  @Input() showBackButton = true;
  @Input() backRoute?: string;

  private readonly router = inject(Router);

  onBack(): void {
    if (this.backRoute) {
      this.router.navigate([this.backRoute]);
    } else {
      window.history.back();
    }
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    if (item.route && !item.isActive) {
      this.router.navigate([item.route]);
    }
  }
}
