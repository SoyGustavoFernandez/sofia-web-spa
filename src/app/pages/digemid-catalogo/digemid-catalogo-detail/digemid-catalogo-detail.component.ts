import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { DigemidCatalogoService } from '../services/digemid-catalogo.service';

@Component({
  selector: 'app-digemid-catalogo-detail',
  standalone: true,
  templateUrl: './digemid-catalogo-detail.component.html',
  providers: [provideTranslocoScope('digemidCatalogo')],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule,
    MaterialModule,
    PageHeaderComponent,
  ],
})
export class DigemidCatalogoDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(DigemidCatalogoService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    codProd: [''],
    nomProd: [''],
    concent: [null as string | null],
    formaFarmaceutica: [null as string | null],
    fraccion: [null as string | null],
    registroSanitario: [null as string | null],
    titular: [null as string | null],
    estado: [''],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.digemid' },
    { label: 'breadcrumbs.digemid-catalogo', route: '/digemid-catalogo' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.form.disable();
      this.load(id);
    }
  }

  private load(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: data => {
        this.form.patchValue(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('digemidCatalogo.detail.load-error'));
      },
    });
  }
}
