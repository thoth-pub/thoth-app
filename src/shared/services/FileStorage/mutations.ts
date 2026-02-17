import { graphql } from '@/gql';

export const INIT_FILE_UPLOAD = graphql(`
  mutation InitFrontcoverFileUpload($data: NewFrontcoverFileUpload!) {
    initFrontcoverFileUpload(data: $data) {
      fileUploadId
      uploadUrl
      uploadHeaders {
        name
        value
      }
      expiresAt
    }
  }
`);

export const COMPLETE_FILE_UPLOAD = graphql(`
  mutation CompleteFileUpload($data: CompleteFileUpload!) {
    completeFileUpload(data: $data) {
      fileId
      fileType
      mimeType
      bytes
      objectKey
      cdnUrl
    }
  }
`);
