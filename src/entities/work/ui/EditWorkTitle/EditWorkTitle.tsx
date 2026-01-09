import { useQueryClient } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';

import { useCreateTitle, useDeleteTitle, useUpdateTitle, useWork } from '@/src/entities/work';
import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { workTitlesValidationSchema } from '@/src/entities/work/model/work.validation';
import {
  type BaseRecommendedSectionProps,
  getMainTitle,
  HELPER_TEXT,
  IDs,
  isTextContainsAnyMarkdownTag,
  QueryKeys,
  TitleEntity,
} from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import type { LocaleCodeType } from '@/src/shared/types/languages';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MarkdownPreview,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { TitlesFormFields } from './components/TitlesFormFields';

const { WORK_TITLE, EDITION, TITLES, SUBTITLE, LANGUAGE, MARKDOWN_FORMAT } = FORM_FIELDS;
const { EDITION: EDITION_HELPER_TEXT } = HELPER_TEXT;

type EditWorkTitleProps = BaseRecommendedSectionProps &
  Partial<{
    withEdition: boolean;
  }>;

const EditWorkTitle = (props: EditWorkTitleProps) => {
  const { workId, recommended = false, withEdition = true } = props;

  const { work, updateWork } = useWork(workId);
  const isAnyTitleContainsMarkdownTag = work.titles.some((title) => isTextContainsAnyMarkdownTag(title.title));
  const isAnySubtitleContainsMarkdownTag = work.titles.some((title) => isTextContainsAnyMarkdownTag(title.subtitle));
  const isMarkdownFormat = isAnyTitleContainsMarkdownTag || isAnySubtitleContainsMarkdownTag;

  const queryClient = useQueryClient();
  const { createTitle } = useCreateTitle();
  const { updateTitle } = useUpdateTitle();
  const { deleteTitle } = useDeleteTitle(workId);

  const placeholder = getMainTitle(work.titles).title;
  const showIndicator = recommended && !placeholder;

  const titlesDefaultValues = work.titles.map(({ id, title, subtitle, localeCode }) => ({
    titleId: id,
    [WORK_TITLE.name]: title,
    [SUBTITLE.name]: subtitle,
    [LANGUAGE.name]: languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase()),
  }));
  const defaultValues = {
    [TITLES.name]: titlesDefaultValues,
    [EDITION.name]: work?.edition ?? 1,
    [MARKDOWN_FORMAT.name]: isMarkdownFormat,
  };

  const updateTitles = async (data: WorkTitlesForm) => {
    const { [TITLES.name]: titles, [EDITION.name]: edition, [MARKDOWN_FORMAT.name]: markdownFormat } = data;

    const markupFormat = markdownFormat ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;

    if (edition !== work.edition) {
      updateWork({ ...work, edition });
    }

    const newTitles = titles.filter((title) => !work.titles.some((workTitle) => workTitle.id === title.titleId));
    const updatedTitles = titles.filter((title) => work.titles.some((workTitle) => workTitle.id === title.titleId));

    const promises: Promise<TitleEntity>[] = [];

    newTitles.forEach(({ titleId, workTitle, subtitle = '', language }, index) => {
      promises.push(
        createTitle({
          data: {
            id: titleId,
            title: workTitle,
            subtitle,
            localeCode: language.value as LocaleCodeType,
            canonical: work.titles.length === 0 && index === 0,
            fullTitle: `${workTitle} ${subtitle}`,
          },
          relatedWorkId: work.id,
          markupFormat,
        }),
      );
    });

    updatedTitles.forEach(({ titleId, workTitle, subtitle = '', language }) => {
      const existingTitle = work.titles.find((title) => title.id === titleId);

      if (!existingTitle) return;

      promises.push(
        updateTitle({
          data: {
            id: titleId,
            title: workTitle,
            subtitle,
            localeCode: language.value as LocaleCodeType,
            canonical: existingTitle.canonical ?? false,
            fullTitle: `${workTitle} ${subtitle}`,
          },
          relatedWorkId: work.id,
          markupFormat,
        }),
      );
    });

    await Promise.all(promises);

    if (promises.length === 0) return;

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workTranslations, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.translatedWorks, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workEditions, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workPrevEditions, workId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.forthcomingBooksCount] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.publishedBooksCount] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
  };

  return (
    <EditableContent
      formId={IDs.WORK_TITLE}
      defaultValues={defaultValues}
      validationSchema={workTitlesValidationSchema}
      onSubmit={updateTitles}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <TitlesFormFields
            control={control as unknown as Control<WorkTitlesForm>}
            recommended={showIndicator}
            isHelperTextVisible={isHelperTextVisible}
            onDelete={deleteTitle}
          />
          {withEdition && (
            <ContentWrapper>
              <FormFieldLabel label={EDITION.label} id={EDITION.name} />
              <FormTextField
                control={control}
                name={EDITION.name}
                id={EDITION.name}
                type={EDITION.type}
                helperText={EDITION_HELPER_TEXT}
                isHelperTextVisible={isHelperTextVisible}
              />
            </ContentWrapper>
          )}
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={WORK_TITLE.label}
          value={placeholder ?? ''}
          disabled={disabled}
          onEdit={onEdit}
          recommended={showIndicator}
        >
          <Typography component="span">
            <MarkdownPreview source={placeholder} />
          </Typography>
        </Preview>
      )}
    />
  );
};

export default EditWorkTitle;
