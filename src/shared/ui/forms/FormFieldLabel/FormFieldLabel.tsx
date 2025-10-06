import Indicator from '../../core/Indicator/Indicator';
import InputLabel, { type InputLabelProps } from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
  recommended?: boolean;
  component?: 'div' | 'label';
} & InputLabelProps;

const FormFieldLabel = ({ id, label, recommended = false, component = 'label' }: FormFieldLabelProps) => {
  return (
    <InputLabel component={component} htmlFor={id} className="flex items-center gap-3">
      {label} {recommended && <Indicator />}
    </InputLabel>
  );
};

export default FormFieldLabel;
