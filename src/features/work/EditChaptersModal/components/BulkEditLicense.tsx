'use client';

import { useMemo } from 'react';

import type { LicenseAndCopyrightHolderForm, WorkEntity } from '@/src/entities/work/model/work.types';
import { licenseAndCopyrightHolderValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs, licenseOptions } from '@/src/shared/constants';
import {
  AutocompleteField,
  AutocompleteGroup,
  CircularProgress,
  ContentWrapper,
  EditButton,
  FormFieldLabel,
  FormTextField,
  MultipleContentWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import RecommendedSection from '@/src/shared/ui/layout/RecommendedSection/RecommendedSection';

import { useBulkLicenseState } from '../model/useBulkLicenseState';
import BulkMismatchNotice from './BulkMismatchNotice';

const { LICENSE, COPYRIGHT_HOLDER } = FORM_FIELDS;

type BulkEditLicenseProps = {
  chapters: WorkEntity[] | null;
  onSubmit: (license: string, copyrightHolder: string) => Promise<void>;
};

/**
 * Bulk licence control for the multiple-chapters edit modal.
 *
 * Unlike the single-work `EditLicense`, this derives its value from the selected chapters
 * instead of a single `useWork`. Following the contributors/fundings rule, editing is only
 * offered when every selected chapter shares the same licence and copyright holder (or all
 * are empty); otherwise a mismatch notice is shown. When editing is allowed, the
 * just-submitted value stays visible with a saving indicator while the bulk mutation runs.
 */
const BulkEditLicense = (props: BulkEditLicenseProps) => {
  const { chapters, onSubmit } = props;

  const { displayLicense, displayCopyrightHolder, hasMismatch, isSaving, savingCount, submit } = useBulkLicenseState(
    chapters,
    onSubmit,
  );

  const selectedOption = displayLicense === null ? undefined : licenseOptions.find(({ value }) => value === displayLicense);

  // Feed the form the common/pending values so the open form starts from what the user
  // currently sees; a mixed field starts blank rather than defaulting. Prefilling the
  // copyright holder here also stops a licence-only edit from wiping a shared holder.
  const defaultValues = useMemo(
    () => ({ [LICENSE.name]: selectedOption, [COPYRIGHT_HOLDER.name]: displayCopyrightHolder }),
    [selectedOption, displayCopyrightHolder],
  );

  const handleSubmit = ({ license, copyrightHolder }: LicenseAndCopyrightHolderForm) => {
    submit(license.value, copyrightHolder ?? '');
  };

  if (hasMismatch) {
    return (
      <RecommendedSection title={<TranslatedContent content="core details" />} isEmpty={false} isValid>
        {() => <BulkMismatchNotice content="chaptersLicenseMismatch" />}
      </RecommendedSection>
    );
  }

  return (
    <RecommendedSection title={<TranslatedContent content="core details" />} isEmpty={false} isValid>
      {() => (
        <EditableContent
          formId={IDs.WORK_LICENSE_AND_COPYRIGHT_HOLDER}
          isDisabled={isSaving}
          defaultValues={defaultValues}
          validationSchema={licenseAndCopyrightHolderValidationSchema}
          onSubmit={handleSubmit}
          faq={HELPER_TEXT.LICENSE}
          formFields={({ control }) => (
            <MultipleContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={LICENSE.label} id={LICENSE.name} />
                <AutocompleteField
                  control={control}
                  name={LICENSE.name}
                  id={LICENSE.name}
                  options={licenseOptions}
                  groupBy={(option) => option.group ?? ''}
                  renderGroup={({ group, children, key }) => (
                    <AutocompleteGroup key={key} group={group}>
                      {children}
                    </AutocompleteGroup>
                  )}
                />
              </ContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={COPYRIGHT_HOLDER.label} id={COPYRIGHT_HOLDER.name} />
                <FormTextField control={control} name={COPYRIGHT_HOLDER.name} id={COPYRIGHT_HOLDER.name} />
              </ContentWrapper>
            </MultipleContentWrapper>
          )}
          preview={({ disabled, onEdit }) => (
            <ContentWrapper>
              <FormFieldLabel component="div" label={LICENSE.label} />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isSaving && <CircularProgress size={16} aria-hidden />}
                  <Typography>
                    {selectedOption?.label}
                    {displayCopyrightHolder ? ` © ${displayCopyrightHolder}` : ''}
                  </Typography>
                </div>
                {isSaving ? (
                  <Typography role="status" className="text-sm opacity-70">
                    {`Saving licence for ${savingCount} chapters…`}
                  </Typography>
                ) : (
                  <EditButton
                    onClick={onEdit}
                    disabled={disabled}
                    className="opacity-0 group-hover:opacity-100"
                    sx={{ height: '20px', width: '2rem', '@media (min-width: 1280px) ': { height: '2rem' } }}
                  />
                )}
              </div>
            </ContentWrapper>
          )}
        />
      )}
    </RecommendedSection>
  );
};

export default BulkEditLicense;
