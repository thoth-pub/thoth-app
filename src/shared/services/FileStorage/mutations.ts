import { graphql } from '@/gql';

export const INIT_FRONT_COVER_UPLOAD = graphql(`
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

export const INIT_PUBLICATION_FILE_UPLOAD = graphql(`
  mutation InitPublicationFileUpload($data: NewPublicationFileUpload!) {
    initPublicationFileUpload(data: $data) {
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

export const INIT_WORK_FEATURED_VIDEO_FILE_UPLOAD = graphql(`
  mutation InitWorkFeaturedVideoFileUpload($data: NewWorkFeaturedVideoFileUpload!) {
    initWorkFeaturedVideoFileUpload(data: $data) {
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

export const INIT_ADDITIONAL_RESOURCE_FILE_UPLOAD = graphql(`
  mutation InitAdditionalResourceFileUpload($data: NewAdditionalResourceFileUpload!) {
    initAdditionalResourceFileUpload(data: $data) {
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
