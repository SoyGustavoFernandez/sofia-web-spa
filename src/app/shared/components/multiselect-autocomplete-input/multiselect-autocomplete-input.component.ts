import { CommonModule } from "@angular/common";
import { Component, Input, OnInit, forwardRef, OnDestroy } from "@angular/core";
import { ControlValueAccessor, FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { TranslocoModule } from "@jsverse/transloco";
import { MaterialModule } from "@shared/material.module";
import { debounceTime, distinctUntilChanged, Observable, Subject, takeUntil } from "rxjs";

type FetchFn<T> = (query: string) => Observable<T[]>;

@Component({
    selector: "csw-multiselect-autocomplete-input",
    templateUrl: "./multiselect-autocomplete-input.component.html",
    standalone: true,
    imports: [
        CommonModule,
        TranslocoModule,
        MaterialModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        FormsModule,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MultiselectAutocompleteInputComponent),
            multi: true
        }
    ]
})
export class MultiselectAutocompleteInputComponent<T> implements OnInit, OnDestroy, ControlValueAccessor {
    @Input() class !: string;
    @Input() labelKey!: string;
    @Input() placeholder!: string;
    @Input() fetch?: FetchFn<T>;
    @Input() displayWith: ((value: T) => string) | null = null;
    @Input() minLength = 2;
    @Input() multiple = false;
    @Input() maxlength?: number;

    itemList: T[] = [];
    selectedItems: T[] = [];
    searchValue = '';

    // ControlValueAccessor properties
    private onChangeCallback: (value: T | T[] | null) => void = () => {
        // no default action
    };
    private onTouchedCallback: () => void = () => {
        // no default action
    };
    disabled = false;

    // Search subject for debouncing
    private readonly searchSubject = new Subject<string>();
    private readonly destroy$ = new Subject<void>();

    displayValue = (v: T | string | null | undefined): string => {
        if (typeof v === 'string') return v;
        if (v == null) return '';
        return this.displayWith ? this.displayWith(v) : v.toString();
    };

    ngOnInit(): void {
        this.setupSearch();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.searchSubject.complete();
    }

    private setupSearch(): void {
        this.searchSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(searchTerm => {
                if (!searchTerm || searchTerm.length < this.minLength) {
                    this.itemList = [];
                    this.searchValue = '';
                    return;
                }

                if (this.fetch) {
                    this.fetch(searchTerm)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(response => {
                            this.itemList = response;
                            if (this.itemList.length === 0) {
                                this.searchValue = '';
                            }
                        });
                } else {
                    this.itemList = [];
                    this.searchValue = '';
                }
            });
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchValue = target.value;

        // Trigger search
        this.searchSubject.next(this.searchValue);

        // Mark as touched
        this.onTouchedCallback();

        // For single select, update the value immediately
        if (!this.multiple) {
            this.onChangeCallback(this.searchValue as T);
        }
    }

    isSelected(item: T): boolean {
        if (!this.multiple) return false;
        return this.selectedItems.some(selected =>
            this.areItemsEqual(selected, item)
        );
    }

    toggleSelection(item: T): void {
        if (!this.multiple) {
            // Single select behavior
            this.searchValue = this.displayValue(item);
            this.onChangeCallback(item);
            this.onTouchedCallback();
            this.itemList = []; // Clear the dropdown
            return;
        }

        const index = this.selectedItems.findIndex(selected =>
            this.areItemsEqual(selected, item)
        );

        if (index > -1) {
            this.selectedItems = this.selectedItems.filter((_, i) => i !== index);
        } else {
            this.selectedItems = [...this.selectedItems, item];
        }

        // Clear the search input after adding/removing an item
        this.searchValue = '';
        this.itemList = []; // Also clear the dropdown

        this.onChangeCallback([...this.selectedItems]);
        this.onTouchedCallback();
    }

    removeSelectedItem(item: T): void {
        const index = this.selectedItems.findIndex(selected =>
            this.areItemsEqual(selected, item)
        );

        if (index > -1) {
            this.selectedItems = this.selectedItems.filter((_, i) => i !== index);
            this.onChangeCallback([...this.selectedItems]);
            this.onTouchedCallback();
        }
    }

    private getValId(val: any): any {
        if (val == null) return null;
        if (typeof val === 'object') {
            if ('portId' in val) return val.portId;
            if ('id' in val) return val.id;
            if ('code' in val) return val.code;
        }
        return val;
    }

    private areItemsEqual(a: T, b: T): boolean {
        const idA = this.getValId(a);
        const idB = this.getValId(b);
        return a === b || (a != null && b != null && idA != null && idB != null && idA == idB) || JSON.stringify(a) === JSON.stringify(b);
    }

    getSelectedItemsDisplay(): string {
        if (!this.multiple || this.selectedItems.length === 0) {
            return '';
        }
        return this.selectedItems.map(item => this.displayValue(item)).join(', ');
    }

    // ControlValueAccessor implementation
    writeValue(value: T | T[] | null): void {
        if (this.multiple && Array.isArray(value)) {
            this.selectedItems = [...value];
            this.searchValue = '';
        } else if (!this.multiple && value !== null && !Array.isArray(value)) {
            this.searchValue = this.displayValue(value);
        } else {
            this.selectedItems = [];
            this.searchValue = '';
        }
    }

    registerOnChange(fn: (value: T | T[] | null) => void): void {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onBlur() {
        setTimeout(() => {
            this.searchValue = '';
            this.itemList = [];
        }, 150);
    }
}