'use client';

import { useWork } from '@/src/entities/work';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { licenseAndCopyrightHolderValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs, licenseOptions } from '@/src/shared/constants';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
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
  onUpdate?: (data: LicenseAndCopyrightHolderForm) => void;
};

const EditLicense = (props: EditLicenseProps) => {
  const { onUpdate, workId } = props;

  const { work, updateWork } = useWork(workId);

  const defaultLicenseValue = licenseOptions.find((option) => option.value === work.license);

  const copyrightHolderValue = work?.copyrightHolder ?? '';

  let placeholderValue = '';

  if (defaultLicenseValue) {
    placeholderValue += defaultLicenseValue.label;
  }

  if (copyrightHolderValue && copyrightHolderValue.length > 0) {
    placeholderValue += ` © ${copyrightHolderValue}`;
  }

  const updateLicense = ({ license, copyrightHolder }: LicenseAndCopyrightHolderForm) => {
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
      defaultValues={{ [LICENSE.name]: defaultLicenseValue, [COPYRIGHT_HOLDER.name]: copyrightHolderValue }}
      validationSchema={licenseAndCopyrightHolderValidationSchema}
      onSubmit={updateLicense}
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
        <Preview label={LICENSE.label} value={placeholderValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditLicense;
