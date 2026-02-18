import { FileUploadResponse, UploadRequestHeader } from '@/gql/graphql';
import { PublicationId } from '@/src/entities/publication/model/publication.types';
import { WorkId } from '@/src/entities/work/model/work.types';

import { GraphqlService } from '../../api/graphqlService';
import { HTTP_METHODS, ROUTES } from '../../constants';
import { COMPLETE_FILE_UPLOAD, INIT_FRONT_COVER_UPLOAD, INIT_PUBLICATION_FILE_UPLOAD } from './mutations';

export class FileStorage {
  private graphqlService: GraphqlService;

  constructor(token: string, graphqlService = new GraphqlService(token)) {
    this.graphqlService = graphqlService;
  }

  async generateFileMetadata(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const hashResponse = await fetch(ROUTES.GENERATE_FILE_HASH, {
      method: HTTP_METHODS.POST,
      body: formData,
    });
    const { hash } = await hashResponse.json();
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

  async uploadFile(url: string, headers: UploadRequestHeader[], file: File) {
    const headersObject = headers.reduce(
      (acc, header) => {
        acc[header.name] = header.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadUrl', url);
    formData.append('headers', JSON.stringify(headersObject));

    const response = await fetch(ROUTES.UPLOAD_TO_S3, {
      method: HTTP_METHODS.POST,
      body: formData,
    });

    return response.json();
  }

  async completeFileUpload(fileUploadId: string) {
    await this.graphqlService.mutation(COMPLETE_FILE_UPLOAD, {
      data: {
        fileUploadId,
      },
    });
  }

  async uploadWorkCover(workId: WorkId, file: File) {
    const { hash, fileExtension, fileMimeType } = await this.generateFileMetadata(file);

    const initResponse = await this.initFrontCoverUpload({
      workId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file);

    await this.completeFileUpload(initResponse.fileUploadId);
  }

  async uploadPublicationFile(publicationId: PublicationId, file: File) {
    const { hash, fileExtension, fileMimeType } = await this.generateFileMetadata(file);

    const initResponse = await this.initPublicationUpload({
      publicationId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFile(initResponse.uploadUrl, initResponse.uploadHeaders, file);

    await this.completeFileUpload(initResponse.fileUploadId);
  }
}
