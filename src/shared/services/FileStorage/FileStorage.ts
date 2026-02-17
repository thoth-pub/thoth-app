import { FileUploadResponse, UploadRequestHeader } from '@/gql/graphql';
import { WorkId } from '@/src/entities/work/model/work.types';

import { GraphqlService } from '../../api/graphqlService';
import { HTTP_METHODS, ROUTES } from '../../constants';
import { COMPLETE_FILE_UPLOAD, INIT_FILE_UPLOAD } from './mutations';

export class FileStorage {
  private graphqlService: GraphqlService;

  constructor(token: string, graphqlService = new GraphqlService(token)) {
    this.graphqlService = graphqlService;
  }

  async initFileUpload({
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
    const response = await this.graphqlService.mutation(INIT_FILE_UPLOAD, {
      data: {
        declaredExtension,
        declaredMimeType,
        declaredSha256,
        workId,
      },
    });

    return response.initFrontcoverFileUpload;
  }

  async uploadFrontCoverFile(url: string, headers: UploadRequestHeader[], file: File) {
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

  async completeFrontCoverFileUpload(fileUploadId: string) {
    await this.graphqlService.mutation(COMPLETE_FILE_UPLOAD, {
      data: {
        fileUploadId,
      },
    });
  }

  async uploadWorkCover(workId: WorkId, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const hashResponse = await fetch(ROUTES.GENERATE_FILE_HASH, {
      method: HTTP_METHODS.POST,
      body: formData,
    });
    const { hash } = await hashResponse.json();
    const fileExtension = file.name.split('.').pop() ?? '';
    const fileMimeType = file.type;

    const initResponse = await this.initFileUpload({
      workId,
      declaredExtension: fileExtension,
      declaredMimeType: fileMimeType,
      declaredSha256: hash,
    });

    await this.uploadFrontCoverFile(initResponse.uploadUrl, initResponse.uploadHeaders, file);

    await this.completeFrontCoverFileUpload(initResponse.fileUploadId);
  }
}
