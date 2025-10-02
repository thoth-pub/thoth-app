'use client';

import { motion } from 'motion/react';

import { WorkContribution } from '@/src/entities/work/model/work.types';

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
    <motion.div
      className="my-4 ml-3 flex flex-col gap-8 rounded-xl bg-[var(--color-form-background)]"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeIn' }}
    >
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
    </motion.div>
  );
};

export default ContributionForms;
