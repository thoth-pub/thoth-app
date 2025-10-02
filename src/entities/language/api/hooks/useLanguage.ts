import { type BaseEditSectionProps } from '@/src/shared';

import useCreateLanguage from './useCreateLanguage';
import useDeleteLanguage from './useDeleteLanguage';
import useUpdateLanguage from './useUpdateLanguage';

const useLanguage = (props: BaseEditSectionProps) => {
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
