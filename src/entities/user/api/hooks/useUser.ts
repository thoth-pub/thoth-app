'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ImprintEntity } from '@/src/entities/imprint';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useQueryToken } from '@/src/shared/hooks';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

import type { UserEntity } from '../../model/user.types';

const defaultUser = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  isSuperuser: false,
  linkedPublishers: [],
};

/** The imprints the user holds in the active publisher, and the same imprints as select options. */
const getActiveImprints = (user: Pick<UserEntity, 'linkedPublishers'>, activePublisherId: string | undefined) => {
  const imprintsMap = new Map<string, ImprintEntity>();

  user.linkedPublishers.forEach((publisher) => {
    if (!activePublisherId || activePublisherId !== publisher.publisherId) return;

    publisher.imprints.forEach((imprint) => {
      imprintsMap.set(imprint.id, imprint);
    });
  });

  const imprints = Array.from(imprintsMap.values());
  const imprintsOptions = convertEntityToSelectFieldOptions(
    imprints.map((imprint) => ({ id: imprint.id, name: imprint.name })),
    'name',
  );

  return { imprints, imprintsOptions };
};

const useUser = () => {
  const { userService } = useServices();
  const { activePublisher } = usePublisherStateMachine();
  const token = useQueryToken();

  const {
    data: user = defaultUser,
    error,
    isFetching,
    isLoading,
    isSuccess,
    refetch,
  } = useQuery({
    queryKey: [QueryKeys.userInfo, token],
    queryFn: () => userService.getUser(),
    enabled: token.length > 0,
  });

  const { imprints: userImprints, imprintsOptions: userImprintsOptions } = getActiveImprints(user, activePublisher?.id);

  const isAuthoritative = token.length > 0 && isSuccess && !isFetching;

  /*
    APP-AUTH-IDENTITY-FORMS-01 (thoth-app#287): the settled identity that forms build their
    options and defaults from, with #285's latching semantics (see UploadStep).

    It is first latched only from authoritative `me`, never from the empty user shown while `me`
    loads. A background refetch or a token rotation drops `isAuthoritative` and, for a rotation,
    falls back to the empty user until the new query settles; the latched identity is kept
    through both, so a form in progress is not reset. It is replaced when `me` settles again
    (fresh data, or a different user), and dropped on real identity loss: a failed `me`, or no
    usable token (a failed refresh reads as no token, and so does a signed-out session).
  */
  const [settledUser, setSettledUser] = useState<UserEntity | null>(null);

  const identityLost = Boolean(error) || token.length === 0;
  const nextSettledUser = identityLost ? null : isAuthoritative ? user : settledUser;

  if (nextSettledUser !== settledUser) setSettledUser(nextSettledUser);

  const { imprints: settledImprints, imprintsOptions: settledImprintsOptions } = getActiveImprints(
    nextSettledUser ?? defaultUser,
    activePublisher?.id,
  );

  return {
    user,
    userImprints,
    userImprintsOptions,
    error,
    loading: isLoading,
    isAuthoritative,
    refetch,
    identitySettled: nextSettledUser !== null,
    settledUser: nextSettledUser,
    settledImprints,
    settledImprintsOptions,
  };
};

export default useUser;
