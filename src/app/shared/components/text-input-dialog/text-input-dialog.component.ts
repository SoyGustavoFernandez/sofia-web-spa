import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TranslocoModule, TranslocoService } from "@jsverse/transloco";
import { MaterialModule } from "@shared/material.module";

export interface TextInputDialogData {
    title: string;
    message: string;
    placeholder?: string;
    errorMessage?: string;
}

@Component({
    selector: 'csw-text-input-dialog',
    templateUrl: './text-input-dialog.component.html',
    styleUrls: ['./text-input-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslocoModule,
        MaterialModule,
        ReactiveFormsModule,
    ]
})
export class TextInputDialogComponent {

    public data = inject(MAT_DIALOG_DATA) as TextInputDialogData;
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<TextInputDialogComponent>);
    private readonly snackBar = inject(MatSnackBar);
    private readonly translocoService = inject(TranslocoService);

    form: FormGroup;
    constructor() {
        this.form = this.fb.group({
            text: [{ value: '', disabled: false }, [Validators.required]]
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.form.invalid) {
            if (this.data.errorMessage) {
                this.showMessage(this.data.errorMessage);
            } else {
                this.showMessage(this.translocoService.translate('messages.enter-mandatory-field'));
            }

            this.form.markAllAsTouched();
            return;
        }

        this.dialogRef.close(this.form.get('text')?.value);
    }

    private showMessage(message: string) {
        this.snackBar.open(
            message,
            this.translocoService.translate('actions.close'),
            {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            }
        );
    }
}