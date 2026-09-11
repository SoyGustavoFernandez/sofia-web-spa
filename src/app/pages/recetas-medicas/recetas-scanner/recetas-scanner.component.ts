import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { RecetaMedicaService } from '../services/receta-medica.service';
import { ItemSugerido } from '../models/receta-medica.model';

@Component({
  selector: 'app-recetas-scanner',
  standalone: true,
  templateUrl: './recetas-scanner.component.html',
  styleUrl: './recetas-scanner.component.scss',
  providers: [provideTranslocoScope('recetas-medicas')],
  imports: [CommonModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class RecetasScannerComponent {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;

  private readonly service = inject(RecetaMedicaService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(false);
  readonly dragging = signal(false);
  readonly imagenSeleccionada = signal<File | null>(null);
  readonly imagenPreview = signal<string | null>(null);
  readonly resultados = signal<ItemSugerido[] | null>(null);

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientesAtencion' },
    { label: 'breadcrumbs.recetasMedicas' },
  ];

  get itemsReceta(): ItemSugerido[] {
    return this.resultados()?.filter(i => i.tipoSugerencia === 'Receta') ?? [];
  }

  get itemsSugerencia(): ItemSugerido[] {
    return this.resultados()?.filter(i => i.tipoSugerencia === 'Recomendacion') ?? [];
  }

  abrirCamara(): void {
    this.cameraInput.nativeElement.click();
  }

  abrirGaleria(): void {
    this.galleryInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imagenSeleccionada.set(file);
    this.resultados.set(null);

    const reader = new FileReader();
    reader.onload = e => this.imagenPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    input.value = '';
  }

  interpretar(): void {
    const imagen = this.imagenSeleccionada();
    if (!imagen) return;

    this.loading.set(true);
    this.resultados.set(null);

    this.service.analizar(imagen).subscribe({
      next: items => {
        this.resultados.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('recetasMedicas.scanner.error'));
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);

    if (this.loading()) return;

    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    this.imagenSeleccionada.set(file);
    this.resultados.set(null);

    const reader = new FileReader();
    reader.onload = e => this.imagenPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  limpiar(): void {
    this.imagenSeleccionada.set(null);
    this.imagenPreview.set(null);
    this.resultados.set(null);
  }

  confianzaLabel(confianza: number): string {
    const t = (k: string) => this.transloco.translate(k, {}, 'recetasMedicas');
    if (confianza >= 0.85) return t('scanner.confidence-high');
    if (confianza >= 0.65) return t('scanner.confidence-medium');
    return t('scanner.confidence-low');
  }

  confianzaColor(confianza: number): string {
    if (confianza >= 0.85) return 'primary';
    if (confianza >= 0.65) return 'accent';
    return 'warn';
  }

  tieneEquivalenteConStock(item: ItemSugerido): boolean {
    return item.equivalentes.some(e => e.tieneStock);
  }
}
