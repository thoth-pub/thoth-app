import Indicator from '../../core/Indicator/Indicator';
import InputLabel, { type InputLabelProps } from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
  isRecommended?: boolean;
} & InputLabelProps;

const FormFieldLabel = ({ id, label, isRecommended = false }: FormFieldLabelProps) => {
  return (
    <InputLabel htmlFor={id} className="flex items-center gap-3">
      {label} {isRecommended && <Indicator />}
    </InputLabel>
  );
};

export default FormFieldLabel;
