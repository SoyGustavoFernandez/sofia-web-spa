import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger.service';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);

  constructor() {
    super();
    // Establecer valores por defecto (fallback)
    this.itemsPerPageLabel = 'Items per page';
    this.nextPageLabel = 'Next page';
    this.previousPageLabel = 'Previous page';
    this.firstPageLabel = 'First page';
    this.lastPageLabel = 'Last page';

    // Actualizar cuando las traducciones estén listas
    this.translocoService.events$.subscribe(event => {
      if (event.type === 'translationLoadSuccess') {
        this.updateLabels();
      }
    });

    // Escuchar cambios de idioma
    this.translocoService.langChanges$.subscribe(() => {
      this.updateLabels();
    });

    // Intentar cargar inmediatamente si ya están disponibles
    if (this.translocoService.getActiveLang()) {
      this.updateLabels();
    }
  }

  private updateLabels(): void {
    try {
      const itemsPerPage = this.translocoService.translate(
        'pagination.itemsPerPage'
      );
      const nextPage = this.translocoService.translate('pagination.nextPage');
      const previousPage = this.translocoService.translate(
        'pagination.previousPage'
      );
      const firstPage = this.translocoService.translate('pagination.firstPage');
      const lastPage = this.translocoService.translate('pagination.lastPage');

      // Solo actualizar si las traducciones no devuelven las claves
      if (itemsPerPage !== 'pagination.itemsPerPage') {
        this.itemsPerPageLabel = itemsPerPage;
        this.nextPageLabel = nextPage;
        this.previousPageLabel = previousPage;
        this.firstPageLabel = firstPage;
        this.lastPageLabel = lastPage;

        // Notificar cambios
        this.changes.next();
      }
    } catch {
      // Si hay error, mantener los valores por defecto
      this.logger.warn('Error loading paginator translations');
    }
  }

  override getRangeLabel = (
    page: number,
    pageSize: number,
    length: number
  ): string => {
    try {
      // Mostrar "página actual de páginas totales" en lugar de rangos de índices
      const currentPageNumber = length > 0 ? page + 1 : 0;
      const totalPages = length > 0 ? Math.ceil(length / pageSize) : 0;

      const rangeLabel = this.translocoService.translate('pagination.range', {
        current: currentPageNumber,
        total: totalPages,
      });

      return rangeLabel !== 'pagination.range'
        ? rangeLabel
        : `${currentPageNumber} of ${totalPages}`;
    } catch {
      // Fallback en caso de error
      const currentPageNumber = length > 0 ? page + 1 : 0;
      const totalPages = length > 0 ? Math.ceil(length / pageSize) : 0;
      return `${currentPageNumber} of ${totalPages}`;
    }
  };
}
