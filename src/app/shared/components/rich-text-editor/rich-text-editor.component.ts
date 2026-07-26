import {
  Component,
  Input,
  forwardRef,
  ViewChild,
  ElementRef,
  OnInit,
  inject,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'csw-rich-text-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements OnInit, ControlValueAccessor {
  @Input() placeholder = 'Comentarios adicionales';
  @Input() disabled = false;

  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;

  private value = '';

  private readonly hostEl: ElementRef = inject(ElementRef);
  private readonly parentForm = inject(FormGroupDirective, { optional: true });
  private readonly parentNgForm = inject(NgForm, { optional: true });

  onChange: (value: string) => void = () => {
    /**/
  };
  onTouched: () => void = () => {
    /**/
  };

  ngOnInit(): void {
    // Inicialización
  }

  // ===== ControlValueAccessor =====
  writeValue(value: string | null): void {
    this.value = value || '';
    if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.innerHTML = this.value;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.contentEditable = (!isDisabled).toString();
    }
  }

  get invalid(): boolean {
    const host = this.hostEl.nativeElement;
    const isInvalid = host.classList.contains('ng-invalid');
    const touchedOrDirty =
      host.classList.contains('ng-touched') || host.classList.contains('ng-dirty');
    const submitted = !!(this.parentForm?.submitted || this.parentNgForm?.submitted);
    return isInvalid && (touchedOrDirty || submitted);
  }

  // ===== Editor Actions =====
  onInput(): void {
    if (this.editorRef?.nativeElement) {
      this.value = this.editorRef.nativeElement.innerHTML;
      this.onChange(this.value);
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  execCommand(command: string, value: string | null = null): void {
    if (this.disabled) return;

    document.execCommand(command, false, value || undefined);
    this.editorRef.nativeElement.focus();
    this.onInput();
  }

  // Formato de texto
  toggleBold(): void {
    this.execCommand('bold');
  }

  toggleItalic(): void {
    this.execCommand('italic');
  }

  toggleUnderline(): void {
    this.execCommand('underline');
  }

  toggleStrikethrough(): void {
    this.execCommand('strikeThrough');
  }

  // Encabezados
  formatHeading(level: string): void {
    this.execCommand('formatBlock', level);
  }

  // Listas
  toggleOrderedList(): void {
    this.execCommand('insertOrderedList');
  }

  toggleUnorderedList(): void {
    this.execCommand('insertUnorderedList');
  }

  // Citas
  toggleBlockquote(): void {
    this.execCommand('formatBlock', 'blockquote');
  }

  // Código
  toggleCode(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText) {
      const code = document.createElement('code');
      code.textContent = selectedText;
      code.style.backgroundColor = '#f4f4f4';
      code.style.padding = '2px 4px';
      code.style.borderRadius = '3px';
      code.style.fontFamily = 'monospace';

      range.deleteContents();
      range.insertNode(code);
      this.onInput();
    }
  }

  // Links
  insertLink(): void {
    const url = prompt('Ingrese la URL:');
    if (url) {
      this.execCommand('createLink', url);
    }
  }

  // Alineación
  alignLeft(): void {
    this.execCommand('justifyLeft');
  }

  alignCenter(): void {
    this.execCommand('justifyCenter');
  }

  alignRight(): void {
    this.execCommand('justifyRight');
  }

  alignJustify(): void {
    this.execCommand('justifyFull');
  }

  // Deshacer/Rehacer
  undo(): void {
    this.execCommand('undo');
  }

  redo(): void {
    this.execCommand('redo');
  }

  // Limpiar formato
  removeFormat(): void {
    this.execCommand('removeFormat');
  }

  // Indentación
  indent(): void {
    this.execCommand('indent');
  }

  outdent(): void {
    this.execCommand('outdent');
  }
}
