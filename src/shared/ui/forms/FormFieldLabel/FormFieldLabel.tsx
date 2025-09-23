import InputLabel from '../InputLabel/InputLabel';

type FormFieldLabelProps = {
  label: string;
  id?: string;
};

const FormFieldLabel = ({ id, label }: FormFieldLabelProps) => {
  return (
    <InputLabel
      htmlFor={id}
      sx={{ color: 'var(--color-form-field-label)' }}
    >
      {label}
    </InputLabel>
  );
};

export default FormFieldLabel;
