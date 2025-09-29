import Indicator from '../../core/Indicator/Indicator';
import InputLabel, { type InputLabelProps } from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
  recommended?: boolean;
} & InputLabelProps;

const FormFieldLabel = ({ id, label, recommended = false }: FormFieldLabelProps) => {
  return (
    <InputLabel htmlFor={id} className="flex items-center gap-3">
      {label} {recommended && <Indicator />}
    </InputLabel>
  );
};

export default FormFieldLabel;
