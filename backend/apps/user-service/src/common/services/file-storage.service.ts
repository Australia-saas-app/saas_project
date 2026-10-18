import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FileUploadResponse {
  id: string;
  key: string;
  url: string;
}

@Injectable()
export class FileStorageService {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'FILE_STORAGE_URL',
      'http://localhost:3007',
    );
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    folderId: string,
    ownerId?: string,
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    const uint8Array = new Uint8Array(file);
    const blob = new Blob([uint8Array]);
    formData.append('file', blob, filename);
    if (ownerId) {
      formData.append('ownerId', ownerId);
    }
    formData.append('folderId', folderId);

    const response = await fetch(`${this.baseUrl}/api/files`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${this.configService.get('FILE_STORAGE_API_KEY', '')}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`File upload failed: ${error}`);
    }

    return response.json();
  }
}