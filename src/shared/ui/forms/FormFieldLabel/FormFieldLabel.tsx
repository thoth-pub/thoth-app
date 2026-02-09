import { Typography } from '@mui/material';

import { mergeStyles } from '@/src/shared';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';

import Indicator from '../../core/Indicator/Indicator';
import Tooltip from '../../core/Tooltip/Tooltip';
import TranslatedContent from '../../core/TranslatedContent/TranslatedContent';
import InputLabel, { type InputLabelProps } from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
  recommended?: boolean;
  component?: 'div' | 'label';
  tooltip?: string;
  className?: string;
} & InputLabelProps;

const FormFieldLabel = (props: FormFieldLabelProps) => {
  const { id, label, recommended = false, component = 'label', tooltip = '', className = '' } = props;

  return (
    <InputLabel component={component} htmlFor={id} className={mergeStyles('flex items-center gap-3', className)}>
      <TranslatedContent content={label} namespace={NAMESPACES.enum.forms} />{' '}
      {recommended && tooltip.length > 0 && (
        <Tooltip title={<Typography component="span">{tooltip}</Typography>}>
          <div>
            <Indicator />
          </div>
        </Tooltip>
      )}
      {recommended && tooltip.length < 1 && <Indicator />}
    </InputLabel>
  );
};

export default FormFieldLabel;
