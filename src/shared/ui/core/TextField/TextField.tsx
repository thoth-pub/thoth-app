import TextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { FormFieldOption } from '@/src/shared/interfaces';

import MenuItem from '../MenuItem/MenuItem';

export type TextFieldProps = MuiTextFieldProps & { options?: FormFieldOption[] };

const TextFieldComponent = ({ options, children, ...props }: TextFieldProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.fieldOptions });

  return (
    <TextField {...props}>
      {options &&
        options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {t(option.label.toLowerCase())}
          </MenuItem>
        ))}
      {children}
    </TextField>
  );
};

export default TextFieldComponent;
