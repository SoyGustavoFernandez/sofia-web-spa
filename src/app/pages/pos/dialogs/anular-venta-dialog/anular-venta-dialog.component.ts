import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';

@Component({
  selector: 'app-anular-venta-dialog',
  standalone: true,
  templateUrl: './anular-venta-dialog.component.html',
  providers: [provideTranslocoScope('pos')],
  imports: [ReactiveFormsModule, MatDialogActions, MatDialogContent, MatDialogTitle, MaterialModule, TranslocoModule],
})
export class AnularVentaDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<AnularVentaDialogComponent>);

  readonly form = this.fb.group({
    motivo: ['', [Validators.required, Validators.maxLength(255)]],
  });

  onConfirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value.motivo);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
