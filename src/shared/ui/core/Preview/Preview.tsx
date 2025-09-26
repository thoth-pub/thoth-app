import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import InputLabel from '../../forms/InputLabel/InputLabel';
import ContentWrapper from '../../layout/ContentWrapper/ContentPreview';
import Button from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import Typography from '../Typography/Typography';

type PreviewProps = {
  label: string;
  value?: string;
  onEdit?: () => void;
};

const Preview = ({ label, value, onEdit }: PreviewProps) => {
  return (
    <ContentWrapper>
      <InputLabel component="span">{label}</InputLabel>
      <div className="flex justify-between">
        <Typography className="ml-2">{value}</Typography>
        {!value && (
          <Button startIcon={<AddIcon />} onClick={onEdit} className="mr-auto">
            Add {label}
          </Button>
        )}
        {value && (
          <IconButton className="opacity-0 group-hover:opacity-100" onClick={onEdit}>
            <EditIcon />
          </IconButton>
        )}
      </div>
    </ContentWrapper>
  );
};

export default Preview;
