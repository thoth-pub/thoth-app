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

type EditLicenseProps = BaseRecommendedSectionProps & {
  license?: string;
  copyrightHolder?: string;
  onUpdate?: (data: LicenseAndCopyrightHolderForm) => void;
};

const EditLicense = (props: EditLicenseProps) => {
  const { onUpdate, workId, queryToken, license, copyrightHolder } = props;

  const { work, updateWork } = useWork(workId, queryToken);

  const nullableLicense = { label: 'All Rights Reserved', value: '' };

  const licenseValue = licenseOptions.find((option) => option.value === work.license) ?? nullableLicense;
  const defaultLicenseValue = licenseOptions.find((option) => option.value === license) ?? nullableLicense;
  const appliedLicenseValue = license ? defaultLicenseValue : licenseValue;

  const copyrightHolderValue = work?.copyrightHolder ?? '';
  const appliedCopyrightHolderValue = copyrightHolder ?? copyrightHolderValue;

  const placeholderValue =
    appliedLicenseValue.label + `${appliedCopyrightHolderValue ? ` © ${appliedCopyrightHolderValue}` : ''}`;

  const updateImprint = ({ license, copyrightHolder }: LicenseAndCopyrightHolderForm) => {
    if (onUpdate) {
      onUpdate({ license, copyrightHolder });
      return;
    }

    if (workId.length === 0) return;

    updateWork({ ...work, license: license.value, copyrightHolder });
  };

  return (
    <EditableContent
      formId={IDs.WORK_LICENSE_AND_COPYRIGHT_HOLDER}
      defaultValues={{ [LICENSE.name]: appliedLicenseValue, [COPYRIGHT_HOLDER.name]: appliedCopyrightHolderValue }}
      validationSchema={licenseAndCopyrightHolderValidationSchema}
      onSubmit={updateImprint}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LICENSE.label} id={LICENSE.name} />
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
            <FormFieldLabel label={COPYRIGHT_HOLDER.label} id={COPYRIGHT_HOLDER.name} />
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
      preview={({ disabled, onEdit }) => (
        <Preview label={LICENSE.label} value={placeholderValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditLicense;
