import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Control } from 'react-hook-form';

import { convertOptionToString, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ButtonGroup, Chip, DeleteButton, IconButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { LanguagesForm as LanguagesFormType } from '../../model/language.types';
import { languagesValidationSchema } from '../../model/language.validation';
import { FormFields } from './FormFields';

const { LANGUAGES } = FORM_FIELDS;

type LanguagesFormProps = Partial<{
  defaultValues: LanguagesFormType['languages'];
  showRecommendations: boolean;
  onUpdate: (data: LanguagesFormType) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
}>;

const LanguagesForm = (props: LanguagesFormProps) => {
  const { defaultValues = [], showRecommendations = false, onUpdate, onDelete, onSelectAsMain } = props;

  const placeholder = defaultValues.length > 0 ? defaultValues.join(', ') : undefined;

  return (
    <EditableContent
      formId={IDs.WORK_LANGUAGES}
      validationSchema={languagesValidationSchema}
      onSubmit={(data) => onUpdate?.(data)}
      defaultValues={{ [LANGUAGES.name]: defaultValues }}
      formFields={({ control }) => (
        <FormFields control={control as unknown as Control<LanguagesFormType>} onDelete={onDelete} />
      )}
      preview={({ onEdit }) => (
        <Preview label={LANGUAGES.label} onEdit={onEdit} value={placeholder} recommended={showRecommendations}>
          {placeholder && (
            <ul className="flex w-full flex-col gap-[var(--default-gap)]">
              {defaultValues.map(({ languageId, language: { label, value }, languageRelation, isMain }) => (
                <li key={languageId} className="flex items-center gap-1">
                  <Chip label={value} size="small" component="span" />
                  <Typography>
                    {convertOptionToString(languageRelation)}, {label}
                  </Typography>
                  <ButtonGroup className="ml-auto">
                    <DeleteButton
                      onDelete={() => onDelete?.(languageId)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                    <IconButton onClick={() => onSelectAsMain?.(languageId)}>
                      {isMain ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </ButtonGroup>
                </li>
              ))}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default LanguagesForm;
