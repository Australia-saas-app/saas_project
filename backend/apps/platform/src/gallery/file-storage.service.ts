import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

export interface CreateFolderResponse {
  id: string;
  name: string;
  parentId?: string;
  ownerId?: string;
  createdAt: string;
}

export interface UploadFileResponse {
  id: string;
  key: string;
  url?: string;
  fileName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly baseUrl: string;
  private readonly galleryFolderId = "f7bcfedc-ca1b-452a-9810-97e6434e46fc";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("FILE_STORAGE_URL", "http://localhost:3007/api/files");
  }

  private getAdminToken(): string {
    return this.configService.get<string>("FILE_STORAGE_ADMIN_TOKEN", "");
  }

  async ensureGalleryFolder(): Promise<string> {
    this.logger.log(`Using fixed gallery folder ID: ${this.galleryFolderId}`);
    return this.galleryFolderId;
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<CreateFolderResponse>(
          `${this.baseUrl}/folders`,
          {
            name,
            parentId: parentId || null,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      this.logger.log(`Created folder "${name}" with ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create folder "${name}": ${error.message}`);
      throw error;
    }
  }

  async listFolders(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any[]>(`${this.baseUrl}/folders`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list folders: ${error.message}`);
      throw error;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folderId?: string,
    tags?: string[],
  ): Promise<UploadFileResponse> {
    try {
      const formData = new FormData();
      
      const buffer = Buffer.from(file.buffer);
      const blob = new Blob([buffer], { type: file.mimetype });
      formData.append("file", blob, file.originalname);

      if (folderId) {
        formData.append("folderId", folderId);
      }

      if (tags && tags.length > 0) {
        formData.append("tags", tags.join(","));
      }

      formData.append("ownerId", "platform-service");

      const response = await firstValueFrom(
        this.httpService.post<UploadFileResponse>(`${this.baseUrl}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );

      this.logger.log(`Uploaded file "${file.originalname}" with ID: ${response.data.id}`);
      return {
        ...response.data,
        url: response.data.url || this.getFileUrl(response.data.key),
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file "${file.originalname}": ${error.message}`);
      throw error;
    }
  }

  private getFileUrl(key: string): string {
    const cdnUrl = this.configService.get<string>("FILE_STORAGE_CDN_URL", this.baseUrl);
    return `${cdnUrl}/${key}`;
  }

  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${fileId}`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get file metadata for ${fileId}: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/${fileId}`, {
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
      this.logger.log(`Deleted file with ID: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}: ${error.message}`);
    }
  }
}
