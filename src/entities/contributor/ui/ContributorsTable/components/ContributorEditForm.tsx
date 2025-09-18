'use client';

import { motion } from 'motion/react';

import type { FormFieldOption } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, MarkdownFormWithPreview, TextFormWithPreview } from '@/src/shared/ui';

import { type ContributionType } from '../../../model/contributor.types';
import {
  ContributorFullNameForm,
  contributorFullNameValidationSchema,
  ContributorTypeForm,
  contributorTypeValidationSchema,
} from '../../../model/contributor.validation';
import { EditContributorFormHeader } from './EditContributorFormHeader';

type ContributorEditFormProps = {
  fullName: string;
  contributorType: ContributionType;
  contributorTypeOptions: FormFieldOption[];
  orchidId?: string;
  onClose?: () => void;
  onFullNameUpdate: (fullName: string) => void;
  onContributorTypeUpdate: (contributorType: ContributionType) => void;
};

const { CONTRIBUTOR_FULLNAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY } = FORM_FIELDS;

export const ContributorEditForm = (props: ContributorEditFormProps) => {
  const {
    fullName,
    contributorType,
    contributorTypeOptions,
    orchidId,
    onClose,
    onFullNameUpdate,
    onContributorTypeUpdate,
  } = props;

  const changeFullName = ({ contributorFullName }: ContributorFullNameForm) => {
    onFullNameUpdate(contributorFullName);
  };

  const changeContributorType = ({ contributorType }: ContributorTypeForm) => {
    onContributorTypeUpdate(contributorType);
  };

  return (
    <motion.div
      className="my-4 ml-3 flex flex-col gap-8"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeIn' }}
    >
      <EditContributorFormHeader title={fullName} orchidId={orchidId} onDone={onClose} />
      <TextFormWithPreview
        name={CONTRIBUTOR_FULLNAME.name}
        label={CONTRIBUTOR_FULLNAME.label}
        validationSchema={contributorFullNameValidationSchema}
        defaultValue={fullName}
        onSubmit={changeFullName}
      />
      <TextFormWithPreview
        name={CONTRIBUTOR_TYPE.name}
        label={CONTRIBUTOR_TYPE.label}
        validationSchema={contributorTypeValidationSchema}
        select
        options={contributorTypeOptions}
        defaultValue={contributorType}
        onSubmit={changeContributorType}
      />
      <MarkdownFormWithPreview
        name={CONTRIBUTOR_BIOGRAPHY.name}
        label={CONTRIBUTOR_BIOGRAPHY.label}
        validationSchema={contributorTypeValidationSchema}
      />
      <AddButton className="ml-[180px] self-start">Add Affiliation</AddButton>
    </motion.div>
  );
};
