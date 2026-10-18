import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

export interface UploadFileResponse {
  id: string;
  key: string;
  url?: string;
  fileName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class NoticeFileStorageService {
  private readonly logger = new Logger(NoticeFileStorageService.name);
  private readonly baseUrl: string;
  private readonly noticeFolderId = "6a876d28-57b2-4718-9b64-15a050c5364f";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("FILE_STORAGE_URL", "http://localhost:3007/api/files");
  }

  private getAdminToken(): string {
    return this.configService.get<string>("FILE_STORAGE_ADMIN_TOKEN", "");
  }

  async getNoticeFolderId(): Promise<string> {
    this.logger.log(`Using fixed notice folder ID: ${this.noticeFolderId}`);
    return this.noticeFolderId;
  }

  async uploadFile(
    file: Express.Multer.File,
    folderId?: string,
  ): Promise<UploadFileResponse> {
    try {
      const formData = new FormData();

      const buffer = Buffer.from(file.buffer);
      const blob = new Blob([buffer], { type: file.mimetype });
      formData.append("file", blob, file.originalname);

      const targetFolderId = folderId || this.noticeFolderId;
      formData.append("folderId", targetFolderId);
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
