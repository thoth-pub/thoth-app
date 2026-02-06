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
} as const;
