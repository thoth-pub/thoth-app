'use client';

import { PublisherId } from '@/src/entities/publisher';
import { appConfig, QueryKeys } from '@/src/shared';

import { useSuspenseQuery } from '@tanstack/react-query';
import { WorkService } from '../work.service';

const workService = new WorkService();

const useSuspendedWorks = (publishersIds: PublisherId[], offset = 0, limit = appConfig.data.itemsPerRequestLimit) => {
  const { data: works = [], error } = useSuspenseQuery({
    queryKey: [QueryKeys.works, ...publishersIds, offset, limit],
    queryFn: () => workService.getWorks({ publishersIds, offset, limit }),
  });

  return { works, error };
};

export default useSuspendedWorks;
