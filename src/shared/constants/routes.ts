import { WorkId } from '@/src/entities/work/model/work.types';

import { WorkCopyVariant } from '../types';

export const ROUTES = {
  ROOT: '/',
  ADMIN: '/admin',
  LOGIN: '/auth/login',
  LOGOUT_ERROR: '/auth/logout/error',
  DASHBOARD: '/admin/dashboard',
  NEW_WORK: '/admin/works/new',
  COPY_WORK: (variant: WorkCopyVariant) => `/admin/works/copy?type=${variant}`,
  CREATE_WORK: '/admin/works/new/create',
  WORK_PAGE: (id: string) => `/admin/works/${id}`,
  WORKS: '/admin/works',
  SERIES: '/admin/series',
  PROFILE: '/admin/profile',
  NOT_FOUND: '/not-found',
  BOOKS_SETS: '/admin/sets',
  GENERATE_FILE_HASH: '/api/generateFileHash',
  UPLOAD_TO_S3: '/api/upload-to-s3',
  METADATA_FORMATS: '/api/metadata/formats',
  METADATA_SPECIFICATIONS: (specification: string, workId: WorkId) =>
    `/api/metadata/specifications/${specification}/work/${workId}`,
} as const;
