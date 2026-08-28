import { WorkId } from '@/src/entities/work/model/work.types';

import { WorkCopyVariant } from '../types';

// APP-ADM-01 (ADR-0010): `/admin/*` is the global superuser Admin namespace, so
// the ordinary publisher workspace lives at root level with no `/admin` prefix.
// The retired publisher `/admin/...` paths are deliberately NOT aliased here or
// anywhere else - `/admin` is reserved for Admin.
export const ROUTES = {
  ROOT: '/',
  ADMIN: '/admin',
  LOGIN: '/auth/login',
  LOGOUT_ERROR: '/auth/logout/error',
  DASHBOARD: '/dashboard',
  NEW_WORK: '/works/new',
  COPY_WORK: (variant: WorkCopyVariant) => `/works/copy?type=${variant}`,
  CREATE_WORK: '/works/new/create',
  WORK_PAGE: (id: string) => `/works/${id}`,
  WORKS: '/works',
  SERIES: '/series',
  PUBLISHER: '/publisher',
  // Admin namespace: the existing staff publisher directory.
  PUBLISHERS: '/admin/publishers',
  NOT_FOUND: '/not-found',
  BOOKS_SETS: '/sets',
  METADATA_FORMATS: '/api/metadata/formats',
  METADATA_SPECIFICATIONS: (specification: string, workId: WorkId) =>
    `/api/metadata/specifications/${specification}/work/${workId}`,
} as const;
