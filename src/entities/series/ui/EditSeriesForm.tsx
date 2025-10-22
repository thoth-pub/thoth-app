'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormFieldOption, QueryToken } from '@/src/shared';
import { FORM_FIELDS, seriesTypeOptions } from '@/src/shared/constants/formFields';
import { Button, FormFieldLabel, FormTextField } from '@/src/shared/ui';

import useCreateSeries from '../api/hooks/useCreateSeries';
import { seriesValidationSchema } from '../model/series.validation';

const {
  SERIES_TYPE,
  SERIES_NAME,
  SERIES_ISSN_PRINT,
  SERIES_ISSN_DIGITAL,
  SERIES_IMPRINT,
  SERIES_URL,
  SERIES_DESCRIPTION,
} = FORM_FIELDS;

type EditSeriesFormProps = {
  queryToken: QueryToken;
  imprintOptions: FormFieldOption[];
};

export const EditSeriesForm = ({ queryToken, imprintOptions }: EditSeriesFormProps) => {
  const { createSeries } = useCreateSeries({ queryToken });

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(seriesValidationSchema),
  });

  const submit = handleSubmit(
    ({ seriesType, seriesName, imprintId, issnPrint = '', issnDigital = '', url = '', description = '' }) => {
      createSeries({
        type: seriesType,
        name: seriesName,
        issnPrint,
        issnDigital,
        imprintId: imprintId,
        description,
        url,
      });
    },
  );

  return (
    <form className="grid grid-cols-1 gap-y-2 lg:grid-cols-[11.25rem_1fr]">
      <FormFieldLabel label={SERIES_TYPE.label} id={SERIES_TYPE.name} />
      <FormTextField
        control={control}
        name={SERIES_TYPE.name}
        id={SERIES_TYPE.name}
        select
        options={seriesTypeOptions}
      />

      <FormFieldLabel label={SERIES_NAME.label} id={SERIES_NAME.name} />
      <FormTextField control={control} name={SERIES_NAME.name} id={SERIES_NAME.name} />

      <FormFieldLabel label={SERIES_ISSN_PRINT.label} id={SERIES_ISSN_PRINT.name} />
      <FormTextField control={control} name={SERIES_ISSN_PRINT.name} id={SERIES_ISSN_PRINT.name} />

      <FormFieldLabel label={SERIES_ISSN_DIGITAL.label} id={SERIES_ISSN_DIGITAL.name} />
      <FormTextField control={control} name={SERIES_ISSN_DIGITAL.name} id={SERIES_ISSN_DIGITAL.name} />

      <FormFieldLabel label={SERIES_IMPRINT.label} id={SERIES_IMPRINT.name} />
      <FormTextField
        control={control}
        name={SERIES_IMPRINT.name}
        id={SERIES_IMPRINT.name}
        select
        options={imprintOptions}
      />

      <FormFieldLabel label={SERIES_URL.label} id={SERIES_URL.name} />
      <FormTextField control={control} name={SERIES_URL.name} id={SERIES_URL.name} />

      <FormFieldLabel label={SERIES_DESCRIPTION.label} id={SERIES_DESCRIPTION.name} />
      <FormTextField control={control} name={SERIES_DESCRIPTION.name} id={SERIES_DESCRIPTION.name} />

      <Button type="submit" onClick={submit}>
        Submit
      </Button>
    </form>
  );
};
