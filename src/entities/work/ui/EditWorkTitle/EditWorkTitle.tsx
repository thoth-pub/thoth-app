import { useQueryClient } from '@tanstack/react-query';
import type { Control } from 'react-hook-form';

import { useCreateTitle, useDeleteTitle, useUpdateTitle } from '@/src/entities/title';
import { useWork } from '@/src/entities/work';
import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { workTitlesValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs, languageOptionsAlt, QueryKeys } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { BaseRecommendedSectionProps, TitleEntity } from '@/src/shared/types';
import type { LocaleCodeType } from '@/src/shared/types/languages';
import {
  Chip,
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MarkdownPreview,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { getMainTitle } from '@/src/shared/utils';

import { TitlesFormFields } from './components/TitlesFormFields';

const { WORK_TITLE, EDITION, TITLES, SUBTITLE, LANGUAGE } = FORM_FIELDS;
const { EDITION: EDITION_HELPER_TEXT } = HELPER_TEXT;

type EditWorkTitleProps = BaseRecommendedSectionProps &
  Partial<{
    withEdition: boolean;
  }>;

const EditWorkTitle = (props: EditWorkTitleProps) => {
  const { workId, recommended = false, withEdition = true } = props;

  const { work, updateWork } = useWork(workId);

  const queryClient = useQueryClient();
  const { createTitle } = useCreateTitle();
  const { updateTitle } = useUpdateTitle();
  const { deleteTitle } = useDeleteTitle(workId);

  const placeholder = getMainTitle(work.titles).fullTitle;
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
  };

  const updateTitles = async (data: WorkTitlesForm) => {
    const { [TITLES.name]: titles, [EDITION.name]: edition } = data;

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
    queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
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
          namespace={NAMESPACES.enum.common}
          value={placeholder ?? ''}
          disabled={disabled}
          onEdit={onEdit}
          recommended={showIndicator}
        >
          <div className="flex flex-col gap-2">
            <Typography component="span">
              <MarkdownPreview source={placeholder} />
            </Typography>
            <ul className="flex flex-wrap gap-1">
              {work.titles.map(({ id, localeCode }) => (
                <Chip key={id} label={localeCode} size="small" component="li" />
              ))}
            </ul>
          </div>
        </Preview>
      )}
    />
  );
};

export default EditWorkTitle;
