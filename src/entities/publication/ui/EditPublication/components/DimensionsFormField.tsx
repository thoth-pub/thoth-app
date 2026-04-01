'use client';

import InsertLinkIcon from '@mui/icons-material/InsertLink';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { Activity, useEffect, useState } from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';

import { LengthUnit, WeightUnit } from '@/src/shared/constants';
import type { FormFieldName } from '@/src/shared/interfaces';
import { ContentWrapper, FormFieldLabel, FormTextField, IconButton } from '@/src/shared/ui';
import { convertGToOz, convertInToMm, convertMmToIn, convertOzToG } from '@/src/shared/utils';

type DimensionsFormFieldProps = {
  control: Control<FieldValues>;
  metricFieldName: FormFieldName;
  imperialFieldName: FormFieldName;
  label: string;
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
    recommended = false,
    helperText,
    measurementUnit = LengthUnit.enum.Mm,
    onAutoConvert,
  } = props;

  const [autoConvert, setAutoConvert] = useState(false);
  const metricValue = useWatch({ control, name: metricFieldName });
  const imperialValue = useWatch({ control, name: imperialFieldName });

  const handleAutoConvert = () => {
    setAutoConvert((prev) => !prev);
  };

  useEffect(() => {
    const newSizeValue = convertMmToIn(metricValue);
    const newWeightValue = convertGToOz(metricValue);

    if (
      !autoConvert ||
      Math.abs(newSizeValue - imperialValue) < 0.01 ||
      Math.abs(newWeightValue - imperialValue) < 0.01
    )
      return;

    if (measurementUnit === LengthUnit.enum.Mm) {
      onAutoConvert?.(imperialFieldName, newSizeValue);
      return;
    }

    if (measurementUnit === WeightUnit.enum.G) {
      onAutoConvert?.(imperialFieldName, newWeightValue);
    }
  }, [metricValue]);

  useEffect(() => {
    const newSizeValue = convertInToMm(imperialValue);
    const newWeightValue = convertOzToG(imperialValue);

    if (!autoConvert || Math.abs(newSizeValue - metricValue) < 0.01 || Math.abs(newWeightValue - metricValue) < 0.01)
      return;

    if (measurementUnit === LengthUnit.enum.Mm) {
      onAutoConvert?.(metricFieldName, newSizeValue);
      return;
    }

    if (measurementUnit === WeightUnit.enum.G) {
      onAutoConvert?.(metricFieldName, newWeightValue);
    }
  }, [imperialValue]);

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
        <IconButton onClick={handleAutoConvert} className="relative m-auto">
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
