'use client';

import type { CountryCode } from '@/gql/graphql';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { countryCodeOptions, getCountryName } from '@/src/shared/utils';

import { awardCountryValidationSchema } from '../../model/award.validation';

const { AWARD_COUNTRY } = FORM_FIELDS;
const { AWARD_COUNTRY: AWARD_COUNTRY_HELPER_TEXT } = HELPER_TEXT;

type EditAwardCountryProps = {
  defaultValue?: CountryCode | null;
  onUpdate?: (data: CountryCode | null) => void;
};

export const EditAwardCountry = (props: EditAwardCountryProps) => {
  const { defaultValue = null, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_COUNTRY}
      borderTransparent
      isTableVariant
      validationSchema={awardCountryValidationSchema}
      defaultValues={{ [AWARD_COUNTRY.name]: defaultValue ?? '' }}
      onSubmit={(data) => onUpdate?.(data.country as CountryCode | null)}
      faq={AWARD_COUNTRY_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_COUNTRY.label} id={AWARD_COUNTRY.name} />
          <FormTextField
            control={control}
            name={AWARD_COUNTRY.name}
            id={AWARD_COUNTRY.name}
            options={countryCodeOptions}
            select
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={AWARD_COUNTRY.label}
          value={data?.country ? getCountryName(data.country) : ''}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
