'use client';

import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';

import FormFieldLabel from '../../forms/FormFieldLabel/FormFieldLabel';
import ContentWrapper from '../../layout/ContentWrapper/ContentPreview';
import Button from '../Button/Button';
import EditButton from '../EditButton/EditButton';
import Typography from '../Typography/Typography';

type PreviewProps = {
  label: string;
  value?: string;
  recommended?: boolean;
  disabled?: boolean;
  children?: Readonly<React.ReactNode>;
  capitalize?: boolean;
  tooltip?: string;
  onEdit?: () => void;
};

const Preview = (props: PreviewProps) => {
  const { label, value, children, recommended = false, disabled = false, capitalize = false, tooltip, onEdit } = props;

  const { t } = useTranslation();

  return (
    <ContentWrapper>
      <FormFieldLabel component="div" label={label} recommended={recommended} tooltip={tooltip} />
      <div className="flex justify-between">
        {children && children}
        {!children && value && <Typography className={`ml-2 ${capitalize ? 'capitalize' : ''}`}>{value}</Typography>}
        {!value && (
          <Button
            disabled={disabled}
            endIcon={<AddIcon className="opacity-0 group-hover:opacity-100" />}
            onClick={onEdit}
            className="mr-2 ml-2 w-full justify-between"
            sx={{
              textTransform: 'capitalize',
            }}
          >
            {t('add')} {label}
          </Button>
        )}
        {value && <EditButton disabled={disabled} className="opacity-0 group-hover:opacity-100" onClick={onEdit} />}
      </div>
    </ContentWrapper>
  );
};

export default Preview;
