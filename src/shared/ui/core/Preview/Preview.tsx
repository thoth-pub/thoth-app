'use client';

import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';

import { mergeStyles } from '@/src/shared';

import FormFieldLabel from '../../forms/FormFieldLabel/FormFieldLabel';
import ContentWrapper from '../../layout/ContentWrapper/ContentWrapper';
import Button from '../Button/Button';
import EditButton from '../EditButton/EditButton';
import Typography from '../Typography/Typography';

type PreviewProps = {
  label: string;
  value?: string;
  recommended?: boolean;
  disabled?: boolean;
  children?: Readonly<React.ReactNode>;
  editButtonClassName?: string;
  capitalize?: boolean;
  tooltip?: string;
  onEdit?: () => void;
};

const Preview = (props: PreviewProps) => {
  const {
    label,
    value,
    children,
    recommended = false,
    disabled = false,
    capitalize = false,
    tooltip,
    editButtonClassName,
    onEdit,
  } = props;

  const { t } = useTranslation();

  return (
    <ContentWrapper>
      <FormFieldLabel component="div" label={label} recommended={recommended} tooltip={tooltip} />
      <div className="flex justify-between">
        {children && children}
        {!children && value && <Typography className={capitalize ? 'capitalize' : ''}>{value}</Typography>}
        {!value && (
          <Button
            disabled={disabled}
            endIcon={<AddIcon className="opacity-0 group-hover:opacity-100" />}
            onClick={onEdit}
            className="mr-2 w-full justify-between p-0"
            sx={{
              textTransform: 'capitalize',
            }}
          >
            {t('add')} {label}
          </Button>
        )}
        {value && (
          <EditButton
            disabled={disabled}
            className={mergeStyles('opacity-0 group-hover:opacity-100', editButtonClassName)}
            onClick={onEdit}
            sx={{
              height: '20px',
              width: '2rem',

              '@media (min-width: 1280px) ': { height: '2rem' },
            }}
          />
        )}
      </div>
    </ContentWrapper>
  );
};

export default Preview;
