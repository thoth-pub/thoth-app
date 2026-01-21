import { Control } from 'react-hook-form';

import { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { TitlesFormFields } from '@/src/entities/work/ui/EditWorkTitle/components/TitlesFormFields';
import { getMainTitle, IDs, isTextContainsAnyMarkdownTag } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { Chip, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { SetEntity, SetTitleFormType } from '../../model/set.types';
import { setTitleValidationSchema } from '../../model/set.validation';

type EditSetTitleProps = {
  set: SetEntity;
  onSubmit: (data: SetTitleFormType) => void;
  onDelete: (titleId: string) => void;
};

const { WORK_TITLE, TITLES, SUBTITLE, LANGUAGE, MARKDOWN_FORMAT } = FORM_FIELDS;

export const EditSetTitle = ({ set, onSubmit, onDelete }: EditSetTitleProps) => {
  const isAnyTitleContainsMarkdownTag = set.titles.some((title) => isTextContainsAnyMarkdownTag(title.title));
  const isAnySubtitleContainsMarkdownTag = set.titles.some((title) => isTextContainsAnyMarkdownTag(title.subtitle));
  const isMarkdownFormat = isAnyTitleContainsMarkdownTag || isAnySubtitleContainsMarkdownTag;

  const titlesDefaultValues = set.titles.map(({ id, title, subtitle, localeCode }) => ({
    titleId: id,
    [WORK_TITLE.name]: title,
    [SUBTITLE.name]: subtitle,
    [LANGUAGE.name]: languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase()),
  }));
  const defaultValues = {
    [TITLES.name]: titlesDefaultValues,
    [MARKDOWN_FORMAT.name]: isMarkdownFormat,
  };

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
        formFields={({ control, isHelperTextVisible }) => (
          <TitlesFormFields
            control={control as unknown as Control<WorkTitlesForm>}
            isHelperTextVisible={isHelperTextVisible}
            onDelete={onDelete}
          />
        )}
        preview={({ disabled, onEdit }) => (
          <Preview label={WORK_TITLE.label} value={placeholder ?? ''} disabled={disabled} onEdit={onEdit}>
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
