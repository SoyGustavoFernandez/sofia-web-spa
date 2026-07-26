import { PortalModule } from '@angular/cdk/portal';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import {
    ControlValueAccessor,
    FormGroup,
    NG_VALUE_ACCESSOR,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@jsverse/transloco';
import { DecimalPrecisionDirective } from '@shared/directives/decimal-precision.directive';
import { MaterialModule } from '@shared/material.module';

@Component({
    selector: 'csw-decimal-input',
    templateUrl: './decimal-input.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatNativeDateModule,
        MatCardModule,
        PortalModule,
        TranslocoModule,
        MaterialModule,
        DecimalPrecisionDirective,
    ],
    providers: [
        DecimalPipe,
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: DecimalInputComponent,
            multi: true,
        },
    ],
})
export class DecimalInputComponent implements ControlValueAccessor, OnInit {
    @Input() wholePart!: number;
    @Input() decimalPart?: number;
    @Input() formGroup!: FormGroup;
    @Input() formControlName!: string;
    @Input() class?: string;
    @Input() placeholder?: string = '';
    @Input() hasCurrencyFormat?: boolean = false;
    @Input() required = false;
    @Input() disabled = false;

    @Output() valueChange = new EventEmitter<number | null>();
    decimalPipe = inject(DecimalPipe);

    private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);

    inputLength: number;
    displayedValue: string | number = '';
    value: string | number = '';

    constructor() {
        //parte entera, si hay parte decimal le aumentamos 1 por el punto
        this.inputLength =
            this.wholePart + (this.decimalPart ? this.decimalPart + 1 : 0);
    }

    ngOnInit(): void {
        // If component is part of a FormGroup
        if (this.formGroup && this.formControlName) {
            const control = this.formGroup.get(this.formControlName);
            if (control) {
                // Use control's touched state instead of host element classes
                control.markAsPristine();
                control.markAsUntouched();
            }
        }
    }

    // ControlValueAccessor methods
    writeValue(obj: number): void {
        this.value = obj;
        this.formatValue();
    }

    onChange: (value: unknown) => void = () => {
        /**/
    };

    onTouched = () => {
        /**/
    };

    registerOnChange(fn: () => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    // Call this when input changes
    handleInputChange(event: Event) {
        const input = (event.target as HTMLInputElement).value;
        this.value = input;
        this.displayedValue = input; // Show raw value while editing
        this.onChange(input);
        const numericValue = input === '' ? null : Number(input);
        this.valueChange.emit(numericValue);
    }

    formatValue() {
        if (this.value !== null && this.value !== undefined && this.value !== '') {
            // Format with thousands separator, keep decimals

            this.displayedValue = this.hasCurrencyFormat
                ? (this.decimalPipe.transform(this.value, '1.0-4') ?? '')
                : this.value;
        }
    }

    unformatValue() {
        this.displayedValue = this.value || '';
    }

    onFocus() {
        this.unformatValue();
    }

    onBlur() {
        this.formatValue();
        this.onTouched();
    }

    get invalid(): boolean {
        // Instead of checking host element classes, check the form control's state
        if (this.formGroup && this.formControlName) {
            const control = this.formGroup.get(this.formControlName);
            if (control) {
                return control.invalid && (control.touched || control.dirty);
            }
        }

        // Fall back to current implementation if not in a form group
        const host = this.hostEl.nativeElement;
        const isInvalid = host.classList.contains('ng-invalid');
        const touched = host.classList.contains('ng-touched');
        const isDirty = host.classList.contains('ng-dirty');
        return isInvalid && touched && isDirty;
    }
}
