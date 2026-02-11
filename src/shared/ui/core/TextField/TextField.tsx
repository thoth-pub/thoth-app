import TextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

import { useTypedTranslation } from '@/src/shared/hooks';
import { Namespace, NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { FormFieldOption } from '@/src/shared/interfaces';

import MenuItem from '../MenuItem/MenuItem';

export type TextFieldProps = MuiTextFieldProps & {
  options?: FormFieldOption[];
  translateOptions?: boolean;
  namespace?: Namespace;
};

const TextFieldComponent = (props: TextFieldProps) => {
  const { options, children, translateOptions = false, namespace = NAMESPACES.enum.common, ...restProps } = props;
  const { t } = useTypedTranslation({ namespace });

  return (
    <TextField {...restProps}>
      {options &&
        options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {translateOptions ? t(option.label.toLowerCase()) : option.label}
          </MenuItem>
        ))}
      {children}
    </TextField>
  );
};

export default TextFieldComponent;
