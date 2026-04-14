'use client';

import InsertLinkIcon from '@mui/icons-material/InsertLink';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { Activity, useEffect } from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';

import { LengthUnit, WeightUnit } from '@/src/shared/constants';
import useDebounceValue from '@/src/shared/hooks/useDebouncedValue';
import type { FormFieldName } from '@/src/shared/interfaces';
import { ContentWrapper, FormFieldLabel, FormTextField, IconButton } from '@/src/shared/ui';
import { convertGToOz, convertInToMm, convertMmToIn, convertOzToG } from '@/src/shared/utils';

type DimensionsFormFieldProps = {
  control: Control<FieldValues>;
  metricFieldName: FormFieldName;
  imperialFieldName: FormFieldName;
  label: string;
  autoConvert: boolean;
  onToggleAutoConvert: () => void;
  recommended?: boolean;
  helperText?: string;
  measurementUnit?: typeof LengthUnit.enum.Mm | typeof WeightUnit.enum.G;
  onAutoConvert?: (name: FormFieldName, value: number) => void;
};

export const DimensionsFormField = (props: DimensionsFormFieldProps) => {
  const {
    metricFieldName,
    imperialFieldName,
    control,
    label,
    autoConvert,
    onToggleAutoConvert,
    recommended = false,
    helperText,
    measurementUnit = LengthUnit.enum.Mm,
    onAutoConvert,
  } = props;

  const metricValue = useWatch({ control, name: metricFieldName });
  const imperialValue = useWatch({ control, name: imperialFieldName });
  const debouncedMetricValue = useDebounceValue(metricValue, 500);
  const debouncedImperialValue = useDebounceValue(imperialValue, 500);

  useEffect(() => {
    if (!autoConvert) return;

    if (measurementUnit === LengthUnit.enum.Mm) {
      const converted = convertMmToIn(debouncedMetricValue);

      if (Math.abs(converted - imperialValue) < 0.01) return;

      onAutoConvert?.(imperialFieldName, converted);
    }

    if (measurementUnit === WeightUnit.enum.G) {
      const converted = convertGToOz(debouncedMetricValue);

      if (Math.abs(converted - imperialValue) < 0.01) return;

      onAutoConvert?.(imperialFieldName, converted);
    }
  }, [debouncedMetricValue]);

  useEffect(() => {
    if (!autoConvert) return;

    if (measurementUnit === LengthUnit.enum.Mm) {
      const converted = convertInToMm(debouncedImperialValue);

      if (Math.abs(converted - metricValue) < 0.01) return;

      onAutoConvert?.(metricFieldName, converted);
    }

    if (measurementUnit === WeightUnit.enum.G) {
      const converted = convertOzToG(debouncedImperialValue);

      if (Math.abs(converted - metricValue) < 0.01) return;

      onAutoConvert?.(metricFieldName, converted);
    }
  }, [debouncedImperialValue]);

  return (
    <ContentWrapper>
      <FormFieldLabel recommended={recommended} label={label} id={metricFieldName} />
      <div className="grid grid-cols-[1fr_3rem_1fr] items-center">
        <FormTextField
          control={control}
          name={metricFieldName}
          id={metricFieldName}
          helperText={helperText}
          type="number"
          min={0}
          step="0.01"
        />
        <IconButton onClick={onToggleAutoConvert} className="relative m-auto">
          <Activity mode={autoConvert ? 'visible' : 'hidden'}>
            <InsertLinkIcon color="primary" />
          </Activity>
          <Activity mode={autoConvert ? 'hidden' : 'visible'}>
            <LinkOffIcon color="primary" />
          </Activity>
        </IconButton>
        <FormTextField
          control={control}
          name={imperialFieldName}
          type="number"
          min={0}
          step="0.01"
          className="mb-auto"
        />
      </div>
    </ContentWrapper>
  );
};
