'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import type { BaseFieldProps } from '@/src/shared/interfaces';

import Checkbox, { type CheckboxProps } from '../../core/Checkbox/Checkbox';

const CheckboxFormField = <T extends FieldValues>(props: BaseFieldProps<T> & CheckboxProps) => {
  const { control, name, ...restProps } = props;

  return (
    <Controller
      control={control}
      name={name as Path<T>}
      render={({ field: { onChange, value } }) => <Checkbox checked={value} onChange={onChange} {...restProps} />}
    />
  );
};

export default CheckboxFormField;
