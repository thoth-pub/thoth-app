'use client';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { BaseFieldProps } from '@/src/shared/interfaces';

import Switch, { type SwitchProps } from '../../core/Switch/Switch';
import Typography from '../../core/Typography/Typography';

type MarkdownSwitchProps<T extends FieldValues> = {
  control: Control<FieldValues>;
  name: string;
} & BaseFieldProps<T> &
  Omit<SwitchProps, 'size'>;

const MarkdownSwitch = <T extends FieldValues>(props: MarkdownSwitchProps<T>) => {
  const { control, name, ...restProps } = props;

  return (
    <div className="flex items-center gap-1">
      <Typography variant="body2" color="primary">
        Text
      </Typography>
      <Controller
        name={name as Path<T>}
        control={control}
        render={({ field: { onChange, value } }) => (
          <Switch size="small" className="-mt-0.5" checked={value} onChange={onChange} {...restProps} />
        )}
      />
      <Typography variant="body2" color="primary">
        Jats
      </Typography>
    </div>
  );
};

export default MarkdownSwitch;
