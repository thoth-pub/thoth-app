import { useDeleteFunding, useFundingStateMachine } from '@/src/entities/funding';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { isDefaultId } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { getDefaultFunding } from '@/src/shared/utils';

export const useEditFundings = (workId: WorkId) => {
  const { work } = useWork(workId);
  const { activeEntity: activeFunding, edit } = useFundingStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { isFundingsRequired, isFundingsEmpty } = useWorkRecommendations({ workId });
  const { deleteFunding } = useDeleteFunding();

  const isNewFunding = activeFunding ? isDefaultId(activeFunding.id) : false;

  const addFunding = () => {
    edit({ ...getDefaultFunding() });
  };

  const editFunding = (id: string) => {
    const funding = work.fundings.find((funding) => funding.id === id);

    if (!funding) return;

    edit({ ...funding });
  };

  return {
    fundings: work.fundings,
    activeFunding,
    isNewFunding,
    editDisabled: !!activeFormId,
    isFundingsRequired,
    isFundingsEmpty,
    deleteFunding,
    addFunding,
    editFunding,
  };
};
