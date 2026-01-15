import { Control } from 'react-hook-form';

import { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { TitlesFormFields } from '@/src/entities/work/ui/EditWorkTitle/components/TitlesFormFields';
import { getMainTitle, IDs, isTextContainsAnyMarkdownTag } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
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
  // const { set } = useSet(setId);

  const isAnyTitleContainsMarkdownTag = set.titles.some((title) => isTextContainsAnyMarkdownTag(title.title));
  const isAnySubtitleContainsMarkdownTag = set.titles.some((title) => isTextContainsAnyMarkdownTag(title.subtitle));
  const isMarkdownFormat = isAnyTitleContainsMarkdownTag || isAnySubtitleContainsMarkdownTag;

  // const queryClient = useQueryClient();
  // const { createTitle } = useCreateTitle();
  // const { updateTitle } = useUpdateTitle();
  // const { deleteTitle } = useDeleteTitle(setId);

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
    // const { [TITLES.name]: titles, [MARKDOWN_FORMAT.name]: markdownFormat } = data;
    // const markupFormat = markdownFormat ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
    // const newTitles = titles.filter((title) => !set.titles.some((setTitle) => setTitle.id === title.titleId));
    // const updatedTitles = titles.filter((title) => set.titles.some((setTitle) => setTitle.id === title.titleId));
    // const promises: Promise<TitleEntity>[] = [];
    // newTitles.forEach(({ titleId, workTitle, subtitle = '', language }, index) => {
    //   promises.push(
    //     createTitle({
    //       data: {
    //         id: titleId,
    //         title: workTitle,
    //         subtitle,
    //         localeCode: language.value as LocaleCodeType,
    //         canonical: set.titles.length === 0 && index === 0,
    //         fullTitle: `${workTitle} ${subtitle}`,
    //       },
    //       relatedWorkId: set.id,
    //       markupFormat,
    //     }),
    //   );
    // });
    // updatedTitles.forEach(({ titleId, workTitle, subtitle = '', language }) => {
    //   const existingTitle = set.titles.find((title) => title.id === titleId);
    //   if (!existingTitle) return;
    //   promises.push(
    //     updateTitle({
    //       data: {
    //         id: titleId,
    //         title: workTitle,
    //         subtitle,
    //         localeCode: language.value as LocaleCodeType,
    //         canonical: existingTitle.canonical ?? false,
    //         fullTitle: `${workTitle} ${subtitle}`,
    //       },
    //       relatedWorkId: set.id,
    //       markupFormat,
    //     }),
    //   );
    // });
    // await Promise.all(promises);
    // if (promises.length === 0) return;
    // queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
    // queryClient.invalidateQueries({ queryKey: [QueryKeys.set, set.id] });
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
            <Typography component="span">
              <MarkdownPreview source={placeholder} />
            </Typography>
          </Preview>
        )}
      />
    </div>
  );
};
