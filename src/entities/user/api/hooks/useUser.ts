'use client';

import { useQuery } from '@tanstack/react-query';

import { ImprintEntity } from '@/src/entities/imprint';
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

  const userImprintsMap = new Map<string, ImprintEntity>();

  user.linkedPublishers.forEach((publisher) => {
    if (!activePublisher || activePublisher.id !== publisher.publisherId) return;

    publisher.imprints.forEach((imprint) => {
      userImprintsMap.set(imprint.id, imprint);
    });
  });

  const userImprints = Array.from(userImprintsMap.values());

  const userImprintsFieldValues = userImprints.map((imprint) => ({
    id: imprint.id,
    name: imprint.name,
  }));

  const userImprintsOptions = convertEntityToSelectFieldOptions(userImprintsFieldValues, 'name');

  return { user, userImprints, userImprintsOptions, error, loading: isLoading, refetch };
};

export default useUser;
