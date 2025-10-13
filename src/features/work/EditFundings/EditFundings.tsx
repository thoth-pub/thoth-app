'use client';

import { useTranslation } from 'react-i18next';

import { useFundingsStateMachine } from '@/src/entities/funding';
import type { FundingEntity } from '@/src/entities/funding/model/funding.type';
import { useWork } from '@/src/entities/work';
import { isDefaultId } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection } from '@/src/shared/ui';

import EditFunding from '../../fundings/EditFunding/EditFunding';

const defaultFunding: FundingEntity = {
  id: appConfig.defaultId,
  grantNumber: '',
  institutionId: '',
  jurisdiction: '',
  program: '',
  projectName: '',
  projectShortname: '',
};

const EditFundings = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { t } = useTranslation();
  const { work } = useWork(workId, queryToken);
  const { activeFunding, close, edit } = useFundingsStateMachine();

  const isEmpty = work.fundings.length === 0;
  const isValid = work.fundings.length > 0;
  const isNewFunding = activeFunding && isDefaultId(activeFunding.id);

  const addFunding = () => {
    if (activeFunding) close();

    edit({ ...defaultFunding });
  };

  return (
    <RecommendedSection title="Fundings" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          {activeFunding && <EditFunding onDone={close} onClose={close} />}
          <AddButton className="px-7 capitalize" onAdd={addFunding} disabled={isNewFunding}>
            {t('add funding')}
          </AddButton>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditFundings;
