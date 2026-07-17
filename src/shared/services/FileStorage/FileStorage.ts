import { sha256 } from 'js-sha256';

import { FileUploadResponse, UploadRequestHeader } from '@/gql/graphql';
import { AdditionalResourceId } from '@/src/entities/additional-resource/model/additional-resource.types';
import { FeaturedVideoId } from '@/src/entities/featured-video/model/featured-video.types';
import { PublicationId } from '@/src/entities/publication/model/publication.types';
import { WorkId } from '@/src/entities/work/model/work.types';

import { GraphqlService } from '../../api/graphqlService';
import { HTTP_METHODS } from '../../constants';
import {
  COMPLETE_FILE_UPLOAD,
  INIT_ADDITIONAL_RESOURCE_FILE_UPLOAD,
  INIT_FRONT_COVER_UPLOAD,
  INIT_PUBLICATION_FILE_UPLOAD,
  INIT_WORK_FEATURED_VIDEO_FILE_UPLOAD,
} from './mutations';

export class FileStorage {
  private graphqlService: GraphqlService;

  constructor(token: string, graphqlService = new GraphqlService(token)) {
    this.graphqlService = graphqlService;
  }

  async generateFileChecksum(file: File) {
    const arrayBuffer = await file.arrayBuffer();

    return sha256(arrayBuffer);
  }

  async generateFileMetadata(file: File) {
    const hash = await this.generateFileChecksum(file);
    const fileExtension = file.name.split('.').pop() ?? '';
    const fileMimeType = file.type;

    return { hash, fileExtension, fileMimeType };
  }

  async initFrontCoverUpload({
    workId,
    declaredExtension,
    declaredMimeType,
    declaredSha256,
  }: {
    workId: WorkId;
    declaredExtension: string;
    declaredMimeType: string;
    declaredSha256: string;
  }): Promise<FileUploadResponse> {
    const response = await this.graphqlService.mutation(INIT_FRONT_COVER_UPLOAD, {
      data: {
        declaredExtension,
        declaredMimeType,
        declaredSha256,
        workId,
      },
    });

    return response.initFrontcoverFileUpload;
  }

  async initPublicationUpload({
    publicationId,
    declaredExtension,
    declaredMimeType,
    declaredSha256,
  }: {
    publicationId: PublicationId;
    declaredExtension: string;
    declaredMimeType: string;
    declaredSha256: string;
  }): Promise<FileUploadResponse> {
    const response = await this.graphqlService.mutation(INIT_PUBLICATION_FILE_UPLOAD, {
      data: {
        declaredExtension,
        declaredMimeType,
        declaredSha256,
        publicationId,
      },
    });

    return response.initPublicationFileUpload;
  }

  async uploadFile(url: string, headers: UploadRequestHeader[], file: File, onProgress?: (progress: number) => void) {
    const headersObject = headers.reduce(
      (acc, header) => {
        acc[header.name] = header.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const fileBuffer = await file.arrayBuffer();

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(HTTP_METHODS.PUT, url);

      Object.entries(headersObject).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) return;

        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }

        reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      xhr.send(fileBuffer);
    });
  }

  async completeFileUpload(fileUploadId: string): Promise<string> {
    const response = await this.graphqlService.mutation(COMPLETE_FILE_UPLOAD, {
      data: {
        fileUploadId,
      },
    });

    return response.completeFileUpload.cdnUrl;
  }

  async uploadWorkCover(workId: WorkId, file: File, onProgress?: (progress: number) => void): Promise<string> {
    // Work covers must be JPEG (validated before upload). The checksum is
    // computed over the exact original bytes, which are uploaded without
    // recompression; the canonical extension and MIME type are always declared
    // regardless of whether the original filename ended in .jpg or .jpeg.
    const hash = await this.generateFileChecksum(file);

    const initResponse = await this.initFrontCoverUpload({
      workId,
      declaredExtension: 'jpg',
      declaredMimeType: 'image/jpeg',
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file, onProgress);

    await this.completeFileUpload(initResponse.fileUploadId);
    // Delay to ensure the file is updated in the database
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return initResponse.uploadUrl;
  }

  async initFeaturedVideoUpload({
    workFeaturedVideoId,
    declaredExtension,
    declaredMimeType,
    declaredSha256,
  }: {
    workFeaturedVideoId: FeaturedVideoId;
    declaredExtension: string;
    declaredMimeType: string;
    declaredSha256: string;
  }): Promise<FileUploadResponse> {
    const response = await this.graphqlService.mutation(INIT_WORK_FEATURED_VIDEO_FILE_UPLOAD, {
      data: {
        declaredExtension,
        declaredMimeType,
        declaredSha256,
        workFeaturedVideoId,
      },
    });

    return response.initWorkFeaturedVideoFileUpload;
  }

  async uploadFeaturedVideoFile(
    workFeaturedVideoId: FeaturedVideoId,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const { hash, fileExtension, fileMimeType } = await this.generateFileMetadata(file);

    const initResponse = await this.initFeaturedVideoUpload({
      workFeaturedVideoId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file, onProgress);

    const url = await this.completeFileUpload(initResponse.fileUploadId);

    return url;
  }

  async initAdditionalResourceUpload({
    additionalResourceId,
    declaredExtension,
    declaredMimeType,
    declaredSha256,
  }: {
    additionalResourceId: AdditionalResourceId;
    declaredExtension: string;
    declaredMimeType: string;
    declaredSha256: string;
  }): Promise<FileUploadResponse> {
    const response = await this.graphqlService.mutation(INIT_ADDITIONAL_RESOURCE_FILE_UPLOAD, {
      data: {
        declaredExtension,
        declaredMimeType,
        declaredSha256,
        additionalResourceId,
      },
    });

    return response.initAdditionalResourceFileUpload;
  }

  async uploadAdditionalResourceFile(
    additionalResourceId: AdditionalResourceId,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const { hash, fileExtension, fileMimeType } = await this.generateFileMetadata(file);

    const initResponse = await this.initAdditionalResourceUpload({
      additionalResourceId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file, onProgress);

    const url = await this.completeFileUpload(initResponse.fileUploadId);

    return url;
  }

  async uploadPublicationFile(
    publicationId: PublicationId,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const { hash, fileExtension, fileMimeType } = await this.generateFileMetadata(file);

    const initResponse = await this.initPublicationUpload({
      publicationId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file, onProgress);

    const url = await this.completeFileUpload(initResponse.fileUploadId);

    return url;
  }
}
