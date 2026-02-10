'use client';

import { useQuery } from '@tanstack/react-query';

import { convertEntityToSelectFieldOptions, QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

const defaultUser = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  isSuperuser: false,
  linkedPublishers: [],
};

const useUser = () => {
  const { userService } = useServices();
  const token = useQueryToken();

  const {
    data: user = defaultUser,
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.userInfo, token],
    queryFn: () => userService.getUser(token),
    enabled: token.length > 0,
  });

  const userImprintsMap = new Map<string, { imprintId: string; imprintName: string }>();

  user.linkedPublishers.forEach((publisher) => {
    publisher.imprints.forEach((imprint) => {
      userImprintsMap.set(imprint.imprintId, imprint);
    });
  });

  const userImprints = Array.from(userImprintsMap.values()).map((imprint) => ({
    id: imprint.imprintId,
    name: imprint.imprintName,
  }));

  const userImprintsOptions = convertEntityToSelectFieldOptions(userImprints, 'name');

  return { user, userImprintsOptions, error, loading: isLoading };
};

export default useUser;
