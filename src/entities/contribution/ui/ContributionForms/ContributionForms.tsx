'use client';

import { TableFormsWrapper } from '@/src/shared/ui';

import type { WorkContribution } from '../../model/contribution.types';
import { ContributionBiographyForm, ContributionNamesForm, ContributionTypeForm } from '../../model/contribution.types';
import { EditBiography } from './components/EditBiography';
import { EditNames } from './components/EditNames';
import { EditType } from './components/EditType';
import { FormHeader } from './components/FormHeader';

type ContributionFormsProps = {
  showRecommendations: boolean;
  contribution: WorkContribution;
  isOrchidEditionDisabled?: boolean;
  isWebsiteUrlEditionDisabled?: boolean;
  children?: React.ReactNode;
  onDone?: () => void;
  onClose?: () => void;
  onNamesSubmit: (data: ContributionNamesForm) => void;
  onContributorTypeSubmit: (data: ContributionTypeForm) => void;
  onBiographySubmit: (data: ContributionBiographyForm) => void;
};

const ContributionForms = (props: ContributionFormsProps) => {
  const {
    showRecommendations,
    contribution,
    children,
    onNamesSubmit,
    onContributorTypeSubmit,
    onBiographySubmit,
    onDone,
    onClose,
  } = props;

  const { fullName, firstName, lastName, type, biography, orcidId } = contribution;

  return (
    <TableFormsWrapper>
      <FormHeader title={fullName} orcidId={orcidId} onDone={onDone} onClose={onClose} />
      <EditNames
        fullName={fullName}
        firstName={firstName}
        lastName={lastName}
        recommended={showRecommendations}
        onSubmit={onNamesSubmit}
      />
      <EditType contributorType={type} onSubmit={onContributorTypeSubmit} />
      <EditBiography biography={biography} recommended={showRecommendations} onSubmit={onBiographySubmit} />
      {children}
    </TableFormsWrapper>
  );
};

export default ContributionForms;
