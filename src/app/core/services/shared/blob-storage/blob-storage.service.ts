import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileSearch } from './dto/file-search';

@Injectable({ providedIn: 'root' })
export class BlobStorageService {
  private readonly http = inject(HttpClient);

  getFiles(query: FileSearch): Observable<string[]> {
    return this.http.post<string[]>('/api/v1/blob/files', query);
  }

  uploadFiles(containerName: string, files: File[]): Observable<unknown> {
    const form = new FormData();
    form.append('containerName', containerName);
    files.forEach(f => form.append('files', f, f.name));
    return this.http.post('/api/v1/blob/upload', form);
  }
}
