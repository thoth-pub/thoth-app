'use client';

import { motion } from 'motion/react';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, MarkdownFormWithPreview, TextFormWithPreview } from '@/src/shared/ui';

import { contributorTypeValidationSchema } from '../../../model/contributor.validation';
import { EditContributorFormHeader } from './EditContributorFormHeader';

type ContributorEditFormProps = {
  name: string;
  orchidId?: string;
  onClose?: () => void;
};

const { CONTRIBUTOR_FULLNAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY } = FORM_FIELDS;

export const ContributorEditForm = ({ name, orchidId, onClose }: ContributorEditFormProps) => {
  return (
    <motion.div
      onSubmit={onClose}
      className="my-4 ml-3 flex flex-col gap-8"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeIn' }}
    >
      <EditContributorFormHeader title={name} orchidId={orchidId} onDone={onClose} />
      <TextFormWithPreview
        name={CONTRIBUTOR_FULLNAME.name}
        label={CONTRIBUTOR_FULLNAME.label}
        validationSchema={contributorTypeValidationSchema}
      />
      <TextFormWithPreview
        name={CONTRIBUTOR_TYPE.name}
        label={CONTRIBUTOR_TYPE.label}
        validationSchema={contributorTypeValidationSchema}
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
