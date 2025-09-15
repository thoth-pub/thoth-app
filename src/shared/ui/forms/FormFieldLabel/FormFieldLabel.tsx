import InputLabel from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
  isHighlighted?: boolean;
};

const FormFieldLabel = ({ id, isHighlighted = false, label }: FormFieldLabelProps) => {
  return (
    <InputLabel
      htmlFor={id}
      sx={{ color: isHighlighted ? 'var(--color-form-field-label-alt)' : 'var(--color-form-field-label)' }}
    >
      {label}
    </InputLabel>
  );
};

export default FormFieldLabel;
