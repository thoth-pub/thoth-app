import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { PublisherId } from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import type { SeriesService } from '../series.service';

/**
 * APP-IMPORT-SERIES-FRESH-01 (thoth-app#317): one read of the user's Series, made directly against the service and
 * outside the TanStack cache, which it never reads, writes, refetches or cancels. The cached list below can be older
 * than a file the user has just selected; the importer plans each file against a read of its own instead.
 *
 * An empty `publishers` filter returns every publisher's Series, so an empty id list is refused without a request.
 */
export const readAllUserSerieses = (seriesService: SeriesService, publishersIds: PublisherId[]) => {
  if (publishersIds.length === 0) {
    return Promise.reject(new Error('Refusing to read Series without a linked publisher'));
  }

  return seriesService.getAllSerieses({ publishersIds });
};

const useAllUserSerieses = () => {
  const { seriesService } = useServices();
  // Keyed on the settled identity: the empty user of a loading `me` or a token rotation would read as "no Series".
  const { identitySettled, settledUser } = useUser();

  const publishersIds = (settledUser?.linkedPublishers ?? []).map((publisher) => publisher.publisherId);

  const {
    data: serieses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.allUserSerieses, ...publishersIds],
    queryFn: () => seriesService.getAllSerieses({ publishersIds }),
    enabled: publishersIds.length > 0,
  });

  /*
    The linked-publisher ids of the settled identity, or null while it is unsettled. Both an unsettled identity and a
    user with no linked publishers give an empty `publishersIds`; only a settled identity with none means "no linked
    publishers" (thoth-app#317, I-3).
  */
  const settledPublishersIds = useMemo(
    () => (settledUser ? settledUser.linkedPublishers.map((publisher) => publisher.publisherId) : null),
    [settledUser],
  );

  const readSerieses = useCallback((ids: PublisherId[]) => readAllUserSerieses(seriesService, ids), [seriesService]);

  return {
    serieses,
    error,
    loading: !identitySettled || isLoading,
    settledPublishersIds,
    readSerieses,
  };
};

export default useAllUserSerieses;
