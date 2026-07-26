import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  let component: RichTextEditorComponent;
  let fixture: ComponentFixture<RichTextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should implement ControlValueAccessor', () => {
    expect(component.writeValue).toBeDefined();
    expect(component.registerOnChange).toBeDefined();
    expect(component.registerOnTouched).toBeDefined();
    expect(component.setDisabledState).toBeDefined();
  });

  it('should write value correctly', () => {
    const testValue = '<p>Test content</p>';
    component.writeValue(testValue);
    expect(component['value']).toBe(testValue);
  });

  it('should handle null value', () => {
    component.writeValue(null);
    expect(component['value']).toBe('');
  });

  it('should call onChange when content changes', () => {
    const spy = jasmine.createSpy('onChange');
    component.registerOnChange(spy);
    component.onInput();
    expect(spy).toHaveBeenCalled();
  });

  it('should call onTouched when blur occurs', () => {
    const spy = jasmine.createSpy('onTouched');
    component.registerOnTouched(spy);
    component.onBlur();
    expect(spy).toHaveBeenCalled();
  });
});
