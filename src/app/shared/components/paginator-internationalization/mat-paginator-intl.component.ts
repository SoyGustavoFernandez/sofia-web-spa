import { inject, Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';

@Injectable()
export class MatPaginatorIntlTransloco extends MatPaginatorIntl {
  private translocoService: TranslocoService = inject(TranslocoService);
  constructor() {
    super();
    this.getAndSetLabels();
    this.translocoService.langChanges$.subscribe(() => {
      this.getAndSetLabels();
      this.changes.next();
    });
  }

  getAndSetLabels() {
    this.translocoService
      .selectTranslate('pagination.itemsPerPage')
      .subscribe(label => {
        this.itemsPerPageLabel = label;
        this.changes.next();
      });
    this.translocoService
      .selectTranslate('pagination.nextPage')
      .subscribe(label => {
        this.nextPageLabel = label;
        this.changes.next();
      });
    this.translocoService
      .selectTranslate('pagination.previousPage')
      .subscribe(label => {
        this.previousPageLabel = label;
        this.changes.next();
      });
    this.translocoService
      .selectTranslate('pagination.firstPage')
      .subscribe(label => {
        this.firstPageLabel = label;
        this.changes.next();
      });
    this.translocoService
      .selectTranslate('pagination.lastPage')
      .subscribe(label => {
        this.lastPageLabel = label;
        this.changes.next();
      });
    this.getRangeLabel = (page: number, pageSize: number, length: number) => {
      if (length === 0) {
        return this.translocoService.translate('pagination.rangeEmpty');
      }
      const current = page + 1;
      const total = Math.ceil(length / pageSize);
      return this.translocoService.translate('pagination.range', { current, total });
    };
  }
}
