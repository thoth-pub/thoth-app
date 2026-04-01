import { type BaseEditSectionProps } from '@/src/shared/types';

import useCreateLanguage from './useCreateLanguage';
import useDeleteLanguage from './useDeleteLanguage';
import useUpdateLanguage from './useUpdateLanguage';

const useLanguage = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { createLanguage } = useCreateLanguage({ workId });
  const { updateLanguage } = useUpdateLanguage({ workId });
  const { deleteLanguage } = useDeleteLanguage();

  return {
    createLanguage,
    updateLanguage,
    deleteLanguage,
  };
};

export default useLanguage;
