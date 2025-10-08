'use client';

import { useWork } from '@/src/entities/work';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { licenseAndCopyrightHolderValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS, licenseOptions } from '@/src/shared/constants/formFields';
import {
  AutocompleteField,
  AutocompleteGroup,
  ContentWrapper,
  FormTextField,
  MultipleContentWrapper,
  Preview,
} from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { LICENSE, COPYRIGHT_HOLDER } = FORM_FIELDS;

export const EditLicense = ({ workId, queryToken, recommended = false }: BaseRecommendedSectionProps) => {
  const { work, updateWork } = useWork(workId, queryToken);

  const licenseValue = licenseOptions.find((option) => option.value === work.license) ?? licenseOptions[0];
  const copyrightHolderValue = work?.copyrightHolder ?? '';
  const showLicenseIndicator = recommended && !work?.license;
  const showCopyrightHolderIndicator = recommended && !work?.copyrightHolder;

  const placeholderValue = licenseValue.label + `${copyrightHolderValue ? ` © ${copyrightHolderValue}` : ''}`;

  const updateImprint = ({ license, copyrightHolder }: LicenseAndCopyrightHolderForm) => {
    updateWork({ ...work, license: license.value, copyrightHolder });
  };

  return (
    <EditableContent
      formId={IDs.WORK_LICENSE_AND_COPYRIGHT_HOLDER}
      defaultValues={{
        [LICENSE.name]: licenseValue,
        [COPYRIGHT_HOLDER.name]: copyrightHolderValue,
      }}
      validationSchema={licenseAndCopyrightHolderValidationSchema}
      onSubmit={updateImprint}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LICENSE.label} id={LICENSE.name} recommended={showLicenseIndicator} />
            <AutocompleteField
              control={control}
              name={LICENSE.name}
              id={LICENSE.name}
              select
              options={licenseOptions}
              helperText={HELPER_TEXT.LICENSE}
              isHelperTextVisible={isHelperTextVisible}
              groupBy={(option) => option.group ?? ''}
              renderGroup={({ group, children, key }) => (
                <AutocompleteGroup key={key} group={group}>
                  {children}
                </AutocompleteGroup>
              )}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel
              label={COPYRIGHT_HOLDER.label}
              id={COPYRIGHT_HOLDER.name}
              recommended={showCopyrightHolderIndicator}
            />
            <FormTextField
              control={control}
              name={COPYRIGHT_HOLDER.name}
              id={COPYRIGHT_HOLDER.name}
              helperText={HELPER_TEXT.COPYRIGHT_HOLDER}
              isHelperTextVisible={isHelperTextVisible}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          label={LICENSE.label}
          value={placeholderValue}
          recommended={showLicenseIndicator || showCopyrightHolderIndicator}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditLicense;
