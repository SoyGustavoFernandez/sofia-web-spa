import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { EmpresaService } from '../services/empresa.service';
import { Empresa } from '../models/empresa.model';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';

@Component({
  selector: 'app-empresa-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslocoModule],
  providers: [provideTranslocoScope('empresa')],
  template: `
    <ng-container *transloco="let t; scope: 'empresa'; read: 'empresa'">
      <h2 mat-dialog-title>{{ t('deleteDialog.title') }}</h2>
      <mat-dialog-content>
        <p>{{ t('deleteDialog.message', { name: empresa.nombre }) }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="false">{{ t('deleteDialog.cancel') }}</button>
        <button mat-flat-button color="warn" (click)="confirm()" [disabled]="loading">
          {{ t('deleteDialog.confirm') }}
        </button>
      </mat-dialog-actions>
    </ng-container>
  `,
})
export class EmpresaDeleteDialogComponent {
  readonly empresa = inject<Empresa>(MAT_DIALOG_DATA);
  private readonly service = inject(EmpresaService);
  private readonly dialogRef = inject(MatDialogRef<EmpresaDeleteDialogComponent>);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly transloco = inject(TranslocoService);

  loading = false;

  confirm(): void {
    this.loading = true;
    this.service.delete(this.empresa.id).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('empresa.notifications.cancelled'));
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.notifier.showError(this.transloco.translate('empresa.notifications.cancelError'));
      },
    });
  }
}
