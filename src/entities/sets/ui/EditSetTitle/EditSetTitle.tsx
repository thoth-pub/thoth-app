import { Control } from 'react-hook-form';

import { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { TitlesFormFields } from '@/src/entities/work/ui/EditWorkTitle/components/TitlesFormFields';
import { FORM_FIELDS, HELPER_TEXT, IDs, languageOptionsAlt } from '@/src/shared/constants';
import { useDefaultLocaleOption } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Chip, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { getMainTitle } from '@/src/shared/utils';

import type { SetEntity, SetTitleFormType } from '../../model/set.types';
import { setTitleValidationSchema } from '../../model/set.validation';

type EditSetTitleProps = {
  set: SetEntity;
  onSubmit: (data: SetTitleFormType) => void;
  onDelete: (titleId: string) => void;
};

const { WORK_TITLE, TITLES, SUBTITLE, LANGUAGE } = FORM_FIELDS;
const { SET_TITLE: SET_TITLE_HELPER_TEXT } = HELPER_TEXT;

export const EditSetTitle = ({ set, onSubmit, onDelete }: EditSetTitleProps) => {
  const titlesDefaultValues = set.titles.map(({ id, title, subtitle, localeCode }) => ({
    titleId: id,
    [WORK_TITLE.name]: title,
    [SUBTITLE.name]: subtitle,
    [LANGUAGE.name]: languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase()),
  }));
  const defaultValues = {
    [TITLES.name]: titlesDefaultValues,
  };

  const defaultLocaleOption = useDefaultLocaleOption(set.imprintId);

  const placeholder = getMainTitle(set.titles).title;

  const updateTitles = async (data: SetTitleFormType) => {
    onSubmit(data);
  };

  return (
    <div>
      <EditableContent
        formId={IDs.SET_TITLE}
        defaultValues={defaultValues}
        validationSchema={setTitleValidationSchema}
        onSubmit={updateTitles}
        isTableVariant
        borderTransparent
        faq={SET_TITLE_HELPER_TEXT}
        formFields={({ control }) => (
          <TitlesFormFields
            control={control as unknown as Control<WorkTitlesForm>}
            defaultLocaleOption={defaultLocaleOption}
            onDelete={onDelete}
          />
        )}
        preview={({ disabled, onEdit }) => (
          <Preview
            label={WORK_TITLE.label}
            value={placeholder ?? ''}
            namespace={NAMESPACES.enum.common}
            disabled={disabled}
            onEdit={onEdit}
          >
            <div className="flex flex-col gap-2">
              <Typography component="span">
                <MarkdownPreview source={placeholder} />
              </Typography>
              <ul className="flex flex-wrap gap-1">
                {set.titles.map(({ id, localeCode }) => (
                  <Chip key={id} label={localeCode} size="small" component="li" />
                ))}
              </ul>
            </div>
          </Preview>
        )}
      />
    </div>
  );
};
