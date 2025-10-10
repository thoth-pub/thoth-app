export const ROUTES = {
  ROOT: '/',
  LOGIN: '/auth/login',
  DASHBOARD: '/admin/dashboard',
  NEW_WORK: '/admin/works/new',
  CREATE_WORK: '/admin/works/new/create',
  WORK_PAGE: (id: string) => `/admin/works/${id}`,
  WORKS: '/admin/works',
  SERIES: '/admin/series',
  NOT_FOUND: '/not-found',
} as const;
