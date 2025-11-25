'use client';

import { useTranslation } from 'react-i18next';

import { FundingsTable, useDeleteFunding, useFundingsStateMachine } from '@/src/entities/funding';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { ANCHORS, isDefaultId } from '@/src/shared';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection } from '@/src/shared/ui';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';
import { getDefaultFunding } from '@/src/shared/utils';

const EditFundings = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { t } = useTranslation();
  const { work } = useWork(workId, queryToken);
  const { activeFunding, close, edit } = useFundingsStateMachine();
  const { isFundingsRequired, isFundingsEmpty } = useWorkRecommendations({ workId });
  const { deleteFunding } = useDeleteFunding({ workId, queryToken });

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
    <RecommendedSection title="Fundings" isEmpty={isFundingsEmpty} isValid={!isFundingsRequired} id={ANCHORS.FUNDINGS}>
      {({ showRecommendations }) => (
        <>
          <FundingsTable
            activeFunding={activeFunding}
            fundings={work.fundings}
            showRecommendations={showRecommendations}
            form={<EditFunding workId={workId} queryToken={queryToken} recommended={showRecommendations} />}
            onDelete={(id) => deleteFunding(id)}
            onEdit={(id) => editFunding(id)}
          />
          {isNewFunding && <AddFunding workId={workId} queryToken={queryToken} />}
          <AddButton className="px-7 capitalize" onAdd={addFunding} disabled={isNewFunding}>
            {t('add funding')}
          </AddButton>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditFundings;
