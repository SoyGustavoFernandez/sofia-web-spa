export interface AttachmentFileDto {
    size?: number;
    type?: string;
    user?: string;
    file?: File;
    selected?: boolean;
    filePath: string;
    fileName: string;
    archiveTypeId?: number;
}