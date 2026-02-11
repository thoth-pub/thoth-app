'use client';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Checkbox, ContentWrapper, InputLabel, TableFormsWrapper } from '@/src/shared/ui';

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
  onIsMainSubmit: (isMain: boolean) => void;
};

const { CANONICAL_CONTRIBUTOR } = FORM_FIELDS;

const ContributionForms = (props: ContributionFormsProps) => {
  const {
    showRecommendations,
    contribution,
    children,
    onNamesSubmit,
    onContributorTypeSubmit,
    onBiographySubmit,
    onIsMainSubmit,
    onDone,
    onClose,
  } = props;

  const { fullName, firstName, lastName, type, biographies, orcidId, id, isMain } = contribution;

  const handleIsMainSubmit = (isMain: boolean) => {
    onIsMainSubmit(isMain);
  };

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
      <EditBiography
        contributionId={id}
        biographies={biographies}
        recommended={showRecommendations}
        onSubmit={onBiographySubmit}
      />
      {children}
      <ContentWrapper>
        <InputLabel component="span">{CANONICAL_CONTRIBUTOR.label}</InputLabel>
        <Checkbox
          checked={isMain}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIsMainSubmit(e.target.checked)}
          className="mr-auto p-0"
        />
      </ContentWrapper>
    </TableFormsWrapper>
  );
};

export default ContributionForms;
