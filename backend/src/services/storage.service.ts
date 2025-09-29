import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { sanitizeFilenameStrict } from '~/common/sanitizer';
import {
  identifyMimeType,
  validateFileMimeType,
  FormDataFile,
} from '~/common/utils';
import { IssueType } from '~/common/types'
import { env } from 'node:process';

export type S3UploadResult = { key: string; url: string; fileName: string; };

export class StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly verifiedBucketName: string;
  private readonly filesMap = new Map<string, string>();
  constructor() {
    if (!env.FIRST_STAGE_BUCKET_NAME) {
      throw new Error('FIRST_STAGE_BUCKET_NAME must be defined in environment');
    }

    if (!env.VERIFIED_IMAGES_BUCKET_NAME) {
      throw new Error('VERIFIED_IMAGES_BUCKET_NAME must be defined in environment');
    }

    if (!env.AWS_DEFAULT_REGION) {
      throw new Error('AWS_DEFAULT_REGION must be defined in environment');
    }

    this.bucketName = env.FIRST_STAGE_BUCKET_NAME;
    this.verifiedBucketName = env.VERIFIED_IMAGES_BUCKET_NAME;
    this.client = new S3Client({
      region: env.AWS_DEFAULT_REGION,
    });
  }

  /**
   * @description
   * @param filePath
   * @param file
   * @param metadata
   * @returns
   */
  public async uploadFileToS3(
    file: FormDataFile,
    metadata: Record<string, string>
  ): Promise<S3UploadResult> {
    const fileName = sanitizeFilenameStrict(file.fileName);
    const key = this.filesMap.get(file.hash);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.data,
      ContentType: file.mimeType,
      Metadata: {
        ...metadata,
      },
    });

    try {
     if (key) {
       await this.client.send(command);
       return {
        fileName,
        key,
        url: `https://${this.bucketName}.s3.${ env.AWS_DEFAULT_REGION ?? 'us-east-1' }.amazonaws.com/${key}`,
      };
     } 
     throw new Error('mapFileKeys');
    } catch (error) {
      console.error(`Failed to upload ${fileName}: ${error}`);
      throw new Error('Failed to upload a file');
    }
  }

  /**
   * @description
   * @param files
   * @param metadata
   * @returns
   */
  public async uploadMultipleFiles(
    files: Array<FormDataFile>,
    metadata: Record<string, string>
  ): Promise<Array<S3UploadResult>> {
    if (files.length === 0 || files.length > 6) {
      throw new Error('Invalid amount of images');
    }

    const allowedTypes = ['image/*'];
    const uploadPromises = files.map(async (file) => {
      // checks if the incoming file matches with it's mimeType and types allowed
      if (
        identifyMimeType(file.data)?.toLocaleLowerCase() ===
          file.mimeType.toLocaleLowerCase() &&
        validateFileMimeType(file.mimeType, allowedTypes)
      ) {
        return await this.uploadFileToS3(file, metadata);
      }
    });

    const uploads = await Promise.all(uploadPromises);

    return uploads.filter((u) => u !== undefined);
  }

  public mapFileKeys(issueType: IssueType, reportId: string, files: Array<FormDataFile> ): Array<{ key: string, hash: string, fileName: string }> {
    return files.map(({ hash, fileName }) =>  {

      const key = `${issueType}/${reportId}/${fileName}`;
      this.filesMap.set(hash, key);
      return { key , hash: hash, fileName };
    });
  }

  /**
   * @description Delete a file from S3 bucket
   * @param key - The S3 object key to delete
   * @returns Promise<void>
   */
  public async deleteFileFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      console.error(`Failed to delete file with key ${key}: ${error}`);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * @description Move a verified image from first stage bucket to verified images bucket
   * @param key - The S3 object key to move
   * @returns Promise<{ url: string; previewUrl: string }>
   */
  public async moveToVerifiedBucket(key: string): Promise<{ url: string; previewUrl: string }> {
    try {
      // Copy the object to the verified bucket
      const copyCommand = new CopyObjectCommand({
        Bucket: this.verifiedBucketName,
        CopySource: `${this.bucketName}/${key}`,
        Key: key,
        MetadataDirective: 'COPY',
      });

      await this.client.send(copyCommand);

      // Delete the original file from the first stage bucket
      await this.deleteFileFromS3(key);

      // Generate URLs for the verified image
      const url = `https://${this.verifiedBucketName}.s3.${env.AWS_DEFAULT_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
      const previewUrl = url; // For now, using the same URL for preview

      return { url, previewUrl };
    } catch (error) {
      console.error(`Failed to move file with key ${key} to verified bucket: ${error}`);
      throw new Error('Failed to move file to verified bucket');
    }
  }

  /**
   * @description Get object metadata from S3
   * @param key - The S3 object key
   * @returns Promise<Record<string, string>>
   */
  public async getObjectMetadata(key: string): Promise<Record<string, string>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      return response.Metadata ?? {};
    } catch (error) {
      console.error(`Failed to get metadata for key ${key}: ${error}`);
      throw new Error('Failed to get object metadata');
    }
  }
}
