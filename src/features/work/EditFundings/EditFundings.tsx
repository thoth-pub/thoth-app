'use client';

import { FundingsTable, useDeleteFunding, useFundingsStateMachine } from '@/src/entities/funding';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { ANCHORS, isDefaultId } from '@/src/shared';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection, TranslatedContent } from '@/src/shared/ui';
import { getDefaultFunding } from '@/src/shared/utils';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';

const EditFundings = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);
  const { activeFunding, edit } = useFundingsStateMachine();
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

  return (
    <RecommendedSection
      title={<TranslatedContent content="funding" />}
      isEmpty={isFundingsEmpty}
      isValid={!isFundingsRequired}
      id={ANCHORS.FUNDINGS}
    >
      {({ showRecommendations }) => (
        <>
          <FundingsTable
            activeFunding={activeFunding}
            fundings={work.fundings}
            showRecommendations={showRecommendations}
            form={<EditFunding workId={workId} recommended={showRecommendations} />}
            onDelete={(id) => deleteFunding(id)}
            onEdit={(id) => editFunding(id)}
          />
          {isNewFunding && <AddFunding workId={workId} />}
          <AddButton className="px-4 capitalize" onAdd={addFunding} disabled={isNewFunding}>
            <TranslatedContent content="actions.addNewFunding" />
          </AddButton>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditFundings;
