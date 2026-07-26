import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
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
  EMPTY,
} from 'rxjs';

type FetchFn<T> = (query: string) => Observable<T[]>;

@Component({
  selector: 'csw-autocomplete-input',
  templateUrl: './autocomplete-input.component.html',
  styleUrl: './autocomplete-input.component.css',
  imports: [MaterialModule, CommonModule, ReactiveFormsModule],
})
export class AutocompleteInputComponent<T> implements OnInit, OnChanges {
  @Input() fetch?: FetchFn<T>;
  @Input() displayWith?: (option: T) => string;
  @Input() control?: FormControl;
  @Input() placeholder?: string;
  @Input() initialText?: string;
  @Input() autoSelectOnExact = true;
  @Input() allowFreeText = true;
  @Input() maxLength?: number;
  @Input() minLength = 2;
  @Input() clearOnInvalidSelection = false;
  /** Control cuyo `invalid`/`touched` se refleja en el borde del campo (p. ej. `depotId` en el padre). */
  @Input() errorSource?: AbstractControl | null;

  @Output() selectedChanges = new EventEmitter<T | null>();
  @Output() blurEvent = new EventEmitter<FocusEvent>();

  @ViewChild(MatAutocompleteTrigger) private readonly trigger?: MatAutocompleteTrigger;

  private pendingInitial?: string;
  inputCtrl!: FormControl;
  filtered$!: Observable<T[]>;
  private readonly lastResults: T[] = [];
  private inputText?: string;
  private hasValidSelection = false;
  loading = false;
  private _isRestoring = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialText'] || !this.inputCtrl) {
      return;
    }
    const next = (this.initialText ?? '').trim();
    if (!next) {
      return;
    }
    const prevRaw = changes['initialText'].previousValue;
    const prev =
      typeof prevRaw === 'string' ? prevRaw.trim() : '';

    if (prev === next) {
      return;
    }

    const cur =
      typeof this.inputCtrl.value === 'string'
        ? (this.inputCtrl.value as string).trim()
        : '';

    if (this.inputCtrl.dirty && cur !== '' && cur !== next) {
      return;
    }

    this.pendingInitial = next;
    this.hasValidSelection = false;
    this.inputCtrl.setValue(next as unknown as T, { emitEvent: true });
  }

  ngOnInit(): void {
    this.inputCtrl = (this.control as FormControl<T | null>) ?? new FormControl<T | null>('' as T);

    this.pendingInitial = this.initialText?.trim() || undefined;
    if (this.pendingInitial) {
      this.inputCtrl.setValue(this.pendingInitial as T, { emitEvent: true });
    }

    this.filtered$ = this.inputCtrl.valueChanges.pipe(
      startWith(this.inputCtrl.value),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        if (this._isRestoring) {
          this._isRestoring = false;
          return EMPTY;
        }

        if (typeof value !== 'string') {
          return of([] as T[]);
        }

        const term = value.trim();
        this.inputText = term;
        if (term.length < this.minLength) {
          // No emitir null en el arranque (texto vacío o corto): padres que sincronizan
          // un id fuera de este control (p. ej. depotId en formulario de instrucción) lo
          // borrarían al ~debounce sin que el usuario haya interactuado.
          if (this.inputCtrl.dirty || this.hasValidSelection) {
            this.selectedChanges.emit(null);
          }
          this.loading = false;
          return of([] as T[]);
        }

        this.loading = !!this.fetch;
        this.hasValidSelection = false;
        return this.fetch ? this.fetch(term) : of([] as T[]);
      }),
      tap(items => {
        this.lastResults.splice(0, this.lastResults.length, ...items);

        if (this.pendingInitial && this.autoSelectOnExact) {
          const match = items.find(
            it => this.displayValue(it) === this.pendingInitial
          );
          if (match) {
            this.inputCtrl.setValue(match as T, { emitEvent: false });
            this.selectedChanges.emit(match);
            this.hasValidSelection = true;
            this.pendingInitial = undefined;
          }
        }
      }),
      tap(() => (this.loading = false))
    );
  }

  onOptionSelected(option: T) {
    const text = this.displayValue(option);
    // No emitir valueChanges aquí: el texto mostrado suele no coincidir con el criterio del fetch
    // (p. ej. "número - nave - puerto") y dispara otra búsqueda vacía que emite objetos espurios
    // en el tap de items.length === 0, borrando datos ya aplicados en el padre.
    this.inputCtrl.setValue(text as unknown as T, { emitEvent: false });
    this.hasValidSelection = true;
    this.selectedChanges.emit(option);
    this.trigger?.closePanel();
  }

  commitFreeText() {
    if (!this.allowFreeText) return;
    const raw = this.inputCtrl.value;
    if (typeof raw !== 'string') return;

    const exact = this.lastResults.some(it => this.displayValue(it) === raw);
    if (!exact) {
      this.selectedChanges.emit(null);
      this.trigger?.closePanel();
    }
  }

  onBlur(event: FocusEvent) {
    this.blurEvent.emit(event);

    if (this.clearOnInvalidSelection) {
      const raw = this.inputCtrl.value;

      // If the value is an object (already selected), it's valid
      if (typeof raw !== 'string') {
        return;
      }

      // If it's a string, check if it matches a valid option
      const isValid = this.hasValidSelection ||
        this.lastResults.some(it => this.displayValue(it) === raw);

      if (!isValid) {
        this.inputCtrl.setValue('', { emitEvent: true });
        this.selectedChanges.emit(null);
      }
    }
  }

  /** Borde de error Material cuando el padre marca `required` en otro control (p. ej. id sin matInput propio). */
  get externalErrorOutline(): boolean {
    const c = this.errorSource;
    if (!c) {
      return false;
    }
    return c.invalid && (c.touched || c.dirty);
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

  restoreValue(value: T | null): void {
    this._isRestoring = true;
    const text = value ? this.displayValue(value) : '';
    this.inputCtrl.setValue(text as unknown as T, { emitEvent: true }); // cancels pending debounce
    this.hasValidSelection = !!value;
  }
}
