'use client';

import { useQuery } from '@tanstack/react-query';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useQueryToken } from '@/src/shared/hooks';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

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
  const { activePublisher } = usePublisherStateMachine();
  const token = useQueryToken();

  const {
    data: user = defaultUser,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QueryKeys.userInfo, token],
    queryFn: () => userService.getUser(),
    enabled: token.length > 0,
  });

  const userImprintsMap = new Map<string, { id: string; name: string }>();

  user.linkedPublishers.forEach((publisher) => {
    if (!activePublisher || activePublisher.id !== publisher.publisherId) return;

    publisher.imprints.forEach((imprint) => {
      userImprintsMap.set(imprint.id, imprint);
    });
  });

  const userImprints = Array.from(userImprintsMap.values()).map((imprint) => ({
    id: imprint.id,
    name: imprint.name,
  }));

  const userImprintsOptions = convertEntityToSelectFieldOptions(userImprints, 'name');

  return { user, userImprintsOptions, error, loading: isLoading, refetch };
};

export default useUser;
