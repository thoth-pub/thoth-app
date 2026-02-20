'use client';

import { FundingsList } from '@/src/entities/funding';
import { ANCHORS } from '@/src/shared';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection, TranslatedContent } from '@/src/shared/ui';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';
import { useEditFundings } from './useEditFundings';

const EditFundings = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const {
    fundings,
    activeFunding,
    isNewFunding,
    editDisabled,
    isFundingsRequired,
    isFundingsEmpty,
    deleteFunding,
    addFunding,
    editFunding,
  } = useEditFundings(workId);

  return (
    <RecommendedSection
      title={<TranslatedContent content="funding" />}
      isEmpty={isFundingsEmpty}
      isValid={!isFundingsRequired}
      id={ANCHORS.FUNDINGS}
    >
      {({ showRecommendations }) => (
        <>
          <FundingsList
            activeFunding={activeFunding}
            fundings={fundings}
            showRecommendations={showRecommendations}
            form={<EditFunding workId={workId} recommended={showRecommendations} />}
            editDisabled={editDisabled}
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
