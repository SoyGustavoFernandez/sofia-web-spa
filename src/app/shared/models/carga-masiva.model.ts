import { BreadcrumbItem } from '@shared/components/page-header/page-header.component';

// Column definition for the bulk-upload preview table
export interface CargaMasivaColumn {
  key: string;
  label: string; // already translated string
  required: boolean;
}

// Configuration injected by each entity's thin wrapper component
export interface CargaMasivaConfig {
  downloadUrl: string;
  previewUrl: string;
  saveUrl: string;
  backRoute: string;
  breadcrumbs: BreadcrumbItem[];
  columns: CargaMasivaColumn[];
}

// Structured validation error returned by the backend per row
export interface ValidationError {
  code: string;                        // e.g. "required", "max-length", "duplicate"
  field: string;                       // e.g. "codigo", "descripcion"
  params?: Record<string, unknown>;    // e.g. { max: 50 } or { value: "KG" }
}

// A single row returned by the backend preview endpoint
export interface PreviewRowResult {
  rowNumber: number;
  data: Record<string, string | null>;
  errors: ValidationError[];
  isValid: boolean;
}

// Full preview response from the backend
export interface PreviewResult {
  rows: PreviewRowResult[];
  totalCount: number;
  validCount: number;
  errorCount: number;
}

// Payload shape the save endpoint expects
export interface SaveResult {
  savedCount: number;
}
