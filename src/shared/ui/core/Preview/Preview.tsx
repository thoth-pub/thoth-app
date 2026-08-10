'use client';

import AddIcon from '@mui/icons-material/Add';
import { use } from 'react';

import useIsGermanLocale from '@/src/shared/hooks/useIsDeutchLocale';
import { Namespace, NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { mergeStyles } from '@/src/shared/utils';

import FormFieldLabel from '../../forms/FormFieldLabel/FormFieldLabel';
import ContentWrapper from '../../layout/ContentWrapper/ContentWrapper';
import Button from '../Button/Button';
import EditButton from '../EditButton/EditButton';
import TranslatedContent from '../TranslatedContent/TranslatedContent';
import Typography from '../Typography/Typography';
import PreviewEditBlockedContext from './PreviewEditBlockedContext';

type PreviewProps = Partial<{
  label: string;
  value: string;
  recommended: boolean;
  disabled: boolean;
  children: Readonly<React.ReactNode>;
  editButtonClassName: string;
  capitalize: boolean;
  tooltip: string;
  addButtonText: string;
  namespace: Namespace;
  valueNamespace: Namespace;
  onEdit: () => void;
}>;

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
    addButtonText,
    namespace = NAMESPACES.enum.forms,
    valueNamespace = NAMESPACES.enum.common,
    onEdit,
  } = props;

  const isGermanLocale = useIsGermanLocale();
  const isEditBlocked = use(PreviewEditBlockedContext);

  return (
    <ContentWrapper>
      {label && (
        <FormFieldLabel
          component="div"
          label={label}
          recommended={recommended}
          tooltip={tooltip}
          namespace={namespace}
        />
      )}
      <div className="flex justify-between">
        {children && children}
        {!children && value && (
          <Typography className={capitalize ? 'capitalize' : ''}>
            {<TranslatedContent content={value} namespace={valueNamespace} />}
          </Typography>
        )}
        {!value && (
          <Button
            disabled={disabled}
            aria-disabled={isEditBlocked || undefined}
            endIcon={<AddIcon className="opacity-0 group-hover:opacity-100" />}
            onClick={onEdit}
            className="mr-2 w-full justify-between p-0"
            sx={{
              textTransform: isGermanLocale ? 'none' : 'capitalize',
            }}
          >
            <span className={`flex gap-1 ${isGermanLocale ? 'flex-row-reverse' : 'flex-row'}`}>
              <span>
                <TranslatedContent content="actions.add" />
              </span>
              <span>
                <TranslatedContent content={`${addButtonText ?? label}`} namespace={namespace} />
              </span>
            </span>
          </Button>
        )}
        {value && (
          <EditButton
            disabled={disabled}
            aria-disabled={isEditBlocked || undefined}
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
