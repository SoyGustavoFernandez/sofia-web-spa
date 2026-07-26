import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MaterialModule } from '@shared/material.module';
import {
  debounceTime,
  distinctUntilChanged,
  Observable,
  switchMap,
  tap,
  of,
  startWith,
} from 'rxjs';

type FetchFn<T> = (query: string) => Observable<T[]>;

@Component({
  selector: 'csw-autocomplete-input',
  templateUrl: './autocomplete-input.component.html',
  styleUrl: './autocomplete-input.component.css',
  imports: [MaterialModule, CommonModule, ReactiveFormsModule],
})
export class AutocompleteInputMultipleComponent<T> implements OnInit {
  @Input() fetch?: FetchFn<T>;
  @Input() displayWith?: (option: T) => string;
  @Input() control?: FormControl;
  @Input() placeholder?: string;
  @Input() initialText?: string;
  @Input() autoSelectOnExact = true;
  @Input() allowFreeText = true;
  @Input() maxLength?: number;
  @Input() minLength = 2;

  @Output() selectedChanges = new EventEmitter<T | null>();

  @ViewChild(MatAutocompleteTrigger) private readonly trigger?: MatAutocompleteTrigger;

  private pendingInitial?: string;
  inputCtrl!: FormControl;
  filtered$!: Observable<T[]>;
  private readonly lastResults: T[] = [];
  private inputText?: string;
  private isExternalUpdate = false;
  public hasValidSelection = false;
  loading = false;

  ngOnInit(): void {
    this.inputCtrl = (this.control as FormControl<T | null>) ?? new FormControl<T | null>('' as T);

    this.pendingInitial = this.initialText?.trim() || undefined;
    if (this.pendingInitial) {
      this.inputCtrl.setValue(this.pendingInitial as T, { emitEvent: true });
    }

    if (this.control) {
      this.control.valueChanges.subscribe(value => {
        if (value !== null && value !== undefined && value !== this.inputCtrl.value) {
          this.isExternalUpdate = true;
          this.inputCtrl.setValue(value, { emitEvent: false });
          if (value && typeof value === 'string' && value.trim()) {
            this.hasValidSelection = true;
          }
          setTimeout(() => this.isExternalUpdate = false, 100);
        }
      });
    }

    this.filtered$ = this.inputCtrl.valueChanges.pipe(
      startWith(this.inputCtrl.value),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value !== 'string') {
          return of([] as T[]);
        }

        const term = value.trim();
        if (term !== this.inputText && !this.isExternalUpdate) {
          this.hasValidSelection = false;
        }
        this.inputText = term;
        if (term.length < this.minLength) {
          if (!this.isExternalUpdate) {
            this.selectedChanges.emit(null);
          }
          this.loading = false;
          return of([] as T[]);
        }

        this.loading = !!this.fetch;
        return this.fetch ? this.fetch(term) : of([] as T[]);
      }),
      tap(items => {
        this.lastResults.length = 0;
        this.lastResults.push(...items);
        
        if (this.pendingInitial && this.autoSelectOnExact) {
          const match = items.find(
            it => this.displayValue(it) === this.pendingInitial
          );
          if (match) {
            this.inputCtrl.setValue(match as T, { emitEvent: false });
            this.selectedChanges.emit(match);
            this.pendingInitial = undefined;
          }
        }
      }),
      tap(() => (this.loading = false))
    );
  }

  onOptionSelected(option: T) {
    const text = this.displayValue(option);
    this.inputCtrl.setValue(text as unknown as T, { emitEvent: false });
    this.hasValidSelection = true;
    this.selectedChanges.emit(option);
    this.trigger?.closePanel();
  }

  commitFreeText() {
    if (!this.allowFreeText) return;
    const raw = this.inputCtrl.value;
    if (typeof raw !== 'string') return;
    if (this.hasValidSelection) return;

    const exact = this.lastResults.some(it => this.displayValue(it) === raw);
    if (!exact) {
      this.inputCtrl.setValue('', { emitEvent: false });
      this.selectedChanges.emit(null);
      this.trigger?.closePanel();
    }
  }

  onInputChange() {
    if (!this.isExternalUpdate) {
      this.hasValidSelection = false;
    }
  }

  onInputBlur() {
    setTimeout(() => {
      if (this.hasValidSelection) {
        return;
      }

      const raw = this.inputCtrl.value;
      if (typeof raw === 'string' && raw.trim()) {
        const exact = this.lastResults.some(it => this.displayValue(it) === raw.trim());
        if (!exact) {
          this.inputCtrl.setValue('', { emitEvent: false });
          this.selectedChanges.emit(null);
        }
      } else if (typeof raw === 'string' && !raw.trim()) {
        this.selectedChanges.emit(null);
      }
    }, 150);
  }

  displayValue = (v: T | string | null | undefined): string => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    return this.displayWith ? this.displayWith(v as T) : v.toString();
  };

  clear(): void {
    this.trigger?.closePanel();

    this.pendingInitial = undefined;
    this.hasValidSelection = false;

    this.inputCtrl.setValue('', { emitEvent: true });
    this.inputCtrl.markAsPristine();
    this.inputCtrl.markAsUntouched();
    this.inputCtrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });

    this.selectedChanges.emit(null);

    this.control?.setValue(null, { emitEvent: false });
    this.control?.markAsPristine();
    this.control?.markAsUntouched();

    this.loading = false;
  }
}
