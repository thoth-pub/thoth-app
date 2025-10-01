import { type WorkId } from '@/src/entities/work/model/work.types';
import { type QueryToken } from '@/src/shared';

import useCreateLanguage from './useCreateLanguage';
import useDeleteLanguage from './useDeleteLanguage';
import useUpdateLanguage from './useUpdateLanguage';

type UseLanguageProps = {
  queryToken: QueryToken;
  workId: WorkId;
};

const useLanguage = (props: UseLanguageProps) => {
  const { queryToken, workId } = props;

  const { createLanguage } = useCreateLanguage({ queryToken, workId });
  const { updateLanguage } = useUpdateLanguage({ queryToken, workId });
  const { deleteLanguage } = useDeleteLanguage({ queryToken, workId });

  return {
    createLanguage,
    updateLanguage,
    deleteLanguage,
  };
};

export default useLanguage;
