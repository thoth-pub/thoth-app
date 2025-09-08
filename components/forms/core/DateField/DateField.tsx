import { DatePicker, type DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { config } from '@/config';
import { BaseFieldProps } from '@/interfaces';

type DateFieldProps<T extends FieldValues> = BaseFieldProps<T> & DatePickerProps;

const { dateFormat } = config;

export const DateField = <T extends FieldValues>(props: DateFieldProps<T>) => {
  const { control, name, ...rest } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field: { onChange, value, ...fieldProps } }) => (
        <DatePicker
          disableFuture
          value={value ? dayjs(value) : null}
          onChange={onChange}
          {...fieldProps}
          {...rest}
          format={dateFormat}
          maxDate={dayjs()}
          slotProps={{
            day: {
              sx: {
                '&.MuiPickersDay-root.Mui-selected': {
                  backgroundColor: 'var(--color-purple)',
                },
              },
            },
          }}
        />
      )}
    />
  );
};
