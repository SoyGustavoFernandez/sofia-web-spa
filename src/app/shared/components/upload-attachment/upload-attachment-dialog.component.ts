import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimezonePipe } from "@shared/pipes/timezone.pipe";
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { SelectionModel } from '@angular/cdk/collections';
import { BlobStorageService } from '@core/services/shared/blob-storage/blob-storage.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { FileSearch } from '@core/services/shared/blob-storage/dto/file-search';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiResponseEnvelope } from '@core/responses/api-response-envelope.model';
import { EnvelopeError } from '@core/responses/common-error-response';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { finalize, Observable } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AttachmentFileDto } from './attachment-file.dto';

@Component({
  selector: 'csw-upload-attachment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatCardModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressBarModule,
    TranslocoModule,
    TimezonePipe
  ],
  templateUrl: './upload-attachment-dialog.component.html',
  styleUrls: ['./upload-attachment-dialog.component.scss'],
})
export class UploadAttachmentDialogComponent {
  allowedTypes: string[] = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  attachments: AttachmentFileDto[] = [];
  currentUser = 'User';
  areFieldsDisabled = false;
  blobContainer = '';
  displayedColumns: string[] = ['select', 'file', 'date', 'user', 'actions'];
  selection = new SelectionModel<AttachmentFileDto>(true, []);

  private readonly blobStorageService: BlobStorageService =
    inject(BlobStorageService);
  private readonly errorNotifierService: ErrorNotifierService =
    inject(ErrorNotifierService);
  private readonly translocoService: TranslocoService =
    inject(TranslocoService);
  isLoading = false;
  private readonly dialog: MatDialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<AttachmentFileDto>);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as {
    areFieldsDisabled: boolean;
    currentUser: string;
    blobContainer: string;
    maxFileSize: number;
    allowedTypes: string[];
    attachments?: AttachmentFileDto[];
  };

  constructor() {
    this.currentUser = this.data.currentUser;
    this.areFieldsDisabled = this.data.areFieldsDisabled ?? false;
    this.blobContainer = this.data.blobContainer ?? this.blobContainer;
    this.allowedTypes = this.data.allowedTypes ?? this.allowedTypes;
    if (this.data.attachments && Array.isArray(this.data.attachments)) {
      this.attachments = this.data.attachments;
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const maxSize = (this.data?.maxFileSize ?? 10) * 1024 * 1024; // bytes
      const oversizedFiles = files.filter(file => file.size > maxSize);
      const filesWithinSize = files.filter(file => file.size <= maxSize);
      const validFiles = filesWithinSize.filter(file => this.isValidFileType(file));
      if ((oversizedFiles.length > 0) || (validFiles.length !== filesWithinSize.length)) {
        const messageError = this.translocoService.translate(
          'attachment.upload-error-file'
        );
        this.errorNotifierService.showSmartErrors([messageError], {
          duration: 5000,
          position: 'top',
        });
      }
      if (validFiles.length > 0) {
        this.processFiles(validFiles);
      } else {
        input.value = '';
        const messageError = this.translocoService.translate(
          'attachment.upload-error-file'
        );
        this.errorNotifierService.showSmartErrors([messageError], {
          duration: 5000,
          position: 'top',
        });
        return;
      }
      input.value = '';
    }
  }

  private getBlobContainerPath(date: Date = new Date()): string {
    const [year, month, day] = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ];
    const path = `${this.blobContainer}/${year}/${month}/${day}/`;
    return path;
  }

  private processFiles(files: File[]): void {
    const blobContainerPath = this.getBlobContainerPath();
    const newAttachments = files.map(file => ({
      fileName: file.name,
      filePath: blobContainerPath + file.name,
      uploadDate: new Date().toISOString(),
      size: file.size,
      type: file.type,
      user: this.currentUser,
      createUser: this.currentUser,
      file: file,
      selected: false,
    }));

    const newFileNames = newAttachments.map(a => a.fileName);
    this.attachments = [
      ...this.attachments.filter(a => !newFileNames.includes(a.fileName)),
      ...newAttachments,
    ];
  }

  private isValidFileType(file: File): boolean {
    return this.allowedTypes.includes(file.type);
  }

  isPdf(attachment: AttachmentFileDto): boolean {
    return attachment.type === 'application/pdf';
  }

  isImage(attachment: AttachmentFileDto): boolean {
    return !!attachment.type && attachment.type.startsWith('image/');
  }

  getFileIcon(attachment: AttachmentFileDto): string {
    if (this.isPdf(attachment)) return 'picture_as_pdf';
    if (this.isImage(attachment)) return 'image';
    return 'description';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.attachments.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.attachments);
    }
  }

  deleteSelected(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: this.translocoService.translate(
          'voyage.modal-attachment.messages.confirmDeleteTitle'
        ),
        message: this.translocoService.translate(
          'voyage.modal-attachment.messages.confirmDeleteMessage'
        ),
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        const selectedIds = this.selection.selected.map(item => item.fileName);
        this.attachments = this.attachments.filter(
          a => !selectedIds.includes(a.fileName)
        );
        this.selection.clear();
      }
    });
  }

  deleteFile(attachment: AttachmentFileDto): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: this.translocoService.translate(
          'attachment.messages.confirmDeleteTitle'
        ),
        message: this.translocoService.translate(
          'attachment.messages.confirmDeleteMessage',
          { fileName: attachment.fileName }
        ),
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.attachments = this.attachments.filter(
          a => a.fileName !== attachment.fileName
        );
        this.selection.deselect(attachment);
      }
    });
  }

  download(attachment: AttachmentFileDto) {
    if (attachment.file) {
      this.downloadFile(attachment);
    } else {
      this.downloadFileBlob(attachment);
    }
  }

  downloadFile(attachment: AttachmentFileDto): void {
    if (!attachment.file) return;
    const url = URL.createObjectURL(attachment.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadFileBlob(attachment: AttachmentFileDto): void {
    const query: FileSearch = {
      containerName: 'voyage',
      filePaths: [attachment.filePath],
    };

    this.blobStorageService.getFiles(query).subscribe({
      next: archivos => {
        if (archivos && archivos.length > 0 && archivos[0].fileUrl) {
          const a = document.createElement('a');
          a.href = archivos[0].fileUrl;
          a.download = attachment.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(archivos[0].fileUrl);
        } else {
          const messageError = this.translocoService.translate(
            'voyage.modal-attachment.download-failed'
          );
          this.errorNotifierService.showSmartErrors([messageError], {
            duration: 5000,
            position: 'top',
          });
        }
      },
      error: () => {
        const messageError = this.translocoService.translate(
          'voyage.modal-attachment.download-failed'
        );
        this.errorNotifierService.showSmartErrors([messageError], {
          duration: 5000,
          position: 'top',
        });
      },
    });
  }

  viewFile(attachment: AttachmentFileDto): void {
    if (!attachment.file) return;
    const url = URL.createObjectURL(attachment.file);
    window.open(url, '_blank');
  }

  saveAttachments(): void {
    if (this.attachments.some(attachment => attachment.fileName.length > 80)) {
      this.snackBar.open(
        this.translocoService.translate(
          'attachment.messages.fileNameLength'
        ),
        this.translocoService.translate('actions.close'),
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        }
      );
      return;
    }

    const filesToSave = this.attachments
      .filter(att => att.file)
      .map(att => att.file as File);

    if (filesToSave.length > 0) {
      if (this.blobContainer !== '') {
        this.isLoading = true;
        this.saveBlob(this.blobContainer, filesToSave)
          .pipe(finalize(() => (this.isLoading = false)))
          .subscribe({
            next: () => {
              const messageSuccess = this.translocoService.translate(
                'attachment.messages.upload-success'
              );
              this.snackBar.open(
                messageSuccess,
                this.translocoService.translate('actions.close'),
                {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                }
              );
              this.dialogRef.close(filesToSave);
            },
            error: err => {
              const envelope = err.error as ApiResponseEnvelope<unknown>;
              const messages: string[] = envelope?.validationErrors?.map(
                (e: EnvelopeError) => e.errorMessage
              ) ?? ['Error'];

              this.errorNotifierService.showSmartErrors(messages, {
                duration: 5000,
                position: 'top',
              });
            },
          });
      } else {
        this.dialogRef.close(filesToSave);
      }
    } else {
      this.dialogRef.close();
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  saveBlob(container: string, file: File[]): Observable<unknown> {
    // Return the observable so caller can decide when to subscribe and handle UI
    return this.blobStorageService.uploadFiles(container, file);
  }

  onCheckboxKeyDown(event: KeyboardEvent, row: AttachmentFileDto): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selection.toggle(row);
    }
  }

  onCheckboxKeyUp(event: KeyboardEvent): void {
    this.handleKeyEvent(event);
  }

  private handleKeyEvent(event: KeyboardEvent): void {
    // Handle key up events if needed
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
    }
  }
}
