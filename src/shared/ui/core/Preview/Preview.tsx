import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import FormFieldLabel from '../../forms/FormFieldLabel/FormFieldLabel';
import ContentWrapper from '../../layout/ContentWrapper/ContentPreview';
import Button from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import Typography from '../Typography/Typography';

type PreviewProps = {
  label: string;
  value?: string;
  recommended?: boolean;
  disabled?: boolean;
  children?: Readonly<React.ReactNode>;
  onEdit?: () => void;
};

const Preview = ({ label, value, children, recommended = false, disabled = false, onEdit }: PreviewProps) => {
  return (
    <ContentWrapper>
      <FormFieldLabel component="div" label={label} recommended={recommended} />
      <div className="flex justify-between">
        {children ? children : <Typography className="ml-2">{value}</Typography>}
        {!value && (
          <Button disabled={disabled} startIcon={<AddIcon />} onClick={onEdit} className="mr-auto">
            Add {label}
          </Button>
        )}
        {value && (
          <IconButton disabled={disabled} className="opacity-0 group-hover:opacity-100" onClick={onEdit}>
            <EditIcon />
          </IconButton>
        )}
      </div>
    </ContentWrapper>
  );
};

export default Preview;
