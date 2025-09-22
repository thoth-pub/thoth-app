'use client';

import { motion } from 'motion/react';

import type { FormFieldOption } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, MarkdownFormWithPreview, TextFormWithPreview } from '@/src/shared/ui';

import { type ContributionType } from '../../../model/contributor.types';
import {
  ContributorFullNameForm,
  contributorFullNameValidationSchema,
  ContributorLastNameForm,
  contributorLastNameValidationSchema,
  ContributorTypeForm,
  contributorTypeValidationSchema,
  OrcidForm,
  orcidValidationSchema,
  WebsiteUrlForm,
  websiteUrlValidationSchema,
} from '../../../model/contributor.validation';
import { EditContributorFormHeader } from './EditContributorFormHeader';

type ContributorEditFormProps = {
  fullName: string;
  lastName: string;
  contributorType: ContributionType;
  contributorTypeOptions: FormFieldOption[];
  orchidId?: string;
  website?: string;
  isOrchidFieldDisabled?: boolean;
  isWebsiteUrlFieldDisabled?: boolean;
  onFullNameUpdate: (fullName: string) => void;
  onLastNameUpdate: (lastName: string) => void;
  onOrcidUpdate: (orcid: string) => void;
  onWebsiteUrlUpdate: (websiteUrl: string) => void;
  onContributorTypeUpdate: (contributorType: ContributionType) => void;
  onClose?: () => void;
};

const { CONTRIBUTOR_FULLNAME, CONTRIBUTOR_TYPE, CONTRIBUTOR_BIOGRAPHY, LAST_NAME, ORCID, WEBSITE_URL } = FORM_FIELDS;

export const ContributorEditForm = (props: ContributorEditFormProps) => {
  const {
    fullName,
    lastName,
    contributorType,
    contributorTypeOptions,
    orchidId = '',
    website = '',
    isOrchidFieldDisabled = false,
    isWebsiteUrlFieldDisabled = false,
    onClose,
    onFullNameUpdate,
    onLastNameUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onContributorTypeUpdate,
  } = props;

  const changeFullName = ({ contributorFullName }: ContributorFullNameForm) => {
    onFullNameUpdate(contributorFullName);
  };

  const changeContributorType = ({ contributorType }: ContributorTypeForm) => {
    onContributorTypeUpdate(contributorType);
  };

  const changeLastName = ({ lastName }: ContributorLastNameForm) => {
    onLastNameUpdate(lastName);
  };

  const changeOrcid = ({ orcid }: OrcidForm) => {
    onOrcidUpdate(orcid ?? '');
  };

  const changeWebsiteUrl = ({ websiteUrl }: WebsiteUrlForm) => {
    onWebsiteUrlUpdate(websiteUrl ?? '');
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
        name={LAST_NAME.name}
        label={LAST_NAME.label}
        validationSchema={contributorLastNameValidationSchema}
        defaultValue={lastName}
        onSubmit={changeLastName}
      />
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
      <TextFormWithPreview
        name={ORCID.name}
        label={ORCID.label}
        validationSchema={orcidValidationSchema}
        defaultValue={orchidId}
        disabled={isOrchidFieldDisabled}
        onSubmit={changeOrcid}
      />
      <TextFormWithPreview
        name={WEBSITE_URL.name}
        label={WEBSITE_URL.label}
        validationSchema={websiteUrlValidationSchema}
        defaultValue={website}
        disabled={isWebsiteUrlFieldDisabled}
        onSubmit={changeWebsiteUrl}
      />
      <AddButton className="ml-[180px] self-start">Add Affiliation</AddButton>
    </motion.div>
  );
};
