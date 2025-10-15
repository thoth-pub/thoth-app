'use client';

import { useTranslation } from 'react-i18next';

import { FundingsTable, useDeleteFunding, useFundingsStateMachine } from '@/src/entities/funding';
import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import { useWork } from '@/src/entities/work';
import { isDefaultId } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection } from '@/src/shared/ui';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';

const defaultFunding: FundingEntity = {
  id: appConfig.defaultId,
  grantNumber: '',
  institutionId: '',
  jurisdiction: '',
  program: '',
  projectName: '',
  projectShortname: '',
  institutionName: '',
  institutionRor: '',
};

const EditFundings = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { t } = useTranslation();
  const { work } = useWork(workId, queryToken);
  const { activeFunding, close, edit } = useFundingsStateMachine();
  const { deleteFunding } = useDeleteFunding({ workId, queryToken });

  const isEmpty = work.fundings.length === 0;
  const isValid = work.fundings.length > 0 && work.fundings.every((funding) => funding.grantNumber.length > 0);
  const isNewFunding = activeFunding && isDefaultId(activeFunding.id);

  const addFunding = () => {
    if (activeFunding) close();

    edit({ ...defaultFunding });
  };

  const editFunding = (id: string) => {
    if (activeFunding) close();

    const funding = work.fundings.find((funding) => funding.id === id);

    if (!funding) return;

    edit({ ...funding });
  };

  return (
    <RecommendedSection title="Fundings" isEmpty={isEmpty} isValid={isValid}>
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
