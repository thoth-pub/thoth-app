'use client';

import { type QueryToken, WorkStatuses } from '@/src/shared';

import useDeleteWork from '../../api/hooks/useDeleteWork';
import useWork from '../../api/hooks/useWork';
import type { WorkId } from '../../model/work.types';

type UseWorkHeaderProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const useWorkHeader = ({ workId, queryToken }: UseWorkHeaderProps) => {
  const { work } = useWork(workId);
  const { deleteWork } = useDeleteWork({ workId, queryToken });

  return { deleteWork, title: work?.title ?? '', status: work?.status ?? WorkStatuses.enum.Forthcoming };
};

export default useWorkHeader;
