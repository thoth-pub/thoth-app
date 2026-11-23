'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useUser } from '@/src/entities/user';
import { useServices } from '@/src/shared/context';

export const CONTRIBUTORS_PAGE_SIZE = 25;

// Reads stay disabled until the user's identity is authoritative AND is a superuser, so a
// pending, failed or non-staff identity can never start a contributor read from this page.
const useContributorAdministration = () => {
  const { user, isAuthoritative } = useUser();
  const { contributorAdminService } = useServices();

  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const isStaff = isAuthoritative && user.isSuperuser;
  const viewState = !isAuthoritative ? 'identityPending' : user.isSuperuser ? 'ready' : 'notAuthorized';

  const list = useQuery({
    queryKey: ['contributorAdmin', 'list', filter, page],
    queryFn: () =>
      contributorAdminService.listContributors(filter, CONTRIBUTORS_PAGE_SIZE, (page - 1) * CONTRIBUTORS_PAGE_SIZE),
    enabled: isStaff,
  });

  const count = useQuery({
    queryKey: ['contributorAdmin', 'count', filter],
    queryFn: () => contributorAdminService.countContributors(filter),
    enabled: isStaff,
  });

  const search = () => {
    setFilter(searchInput);
    setPage(1);
  };

  return {
    viewState,
    searchInput,
    setSearchInput,
    search,
    page,
    setPage,
    contributors: list.data ?? [],
    isLoading: list.isLoading,
    loadFailed: list.isError,
    totalCount: count.data,
    countFailed: count.isError,
    totalPages: Math.max(1, Math.ceil((count.data ?? 0) / CONTRIBUTORS_PAGE_SIZE)),
    refetch: () => {
      void list.refetch();
      void count.refetch();
    },
  };
};

export default useContributorAdministration;
