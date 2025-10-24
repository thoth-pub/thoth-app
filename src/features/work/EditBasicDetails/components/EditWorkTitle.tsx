import type { Control } from 'react-hook-form';

import { useWork } from '@/src/entities/work';
import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { workTitlesValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig, type BaseRecommendedSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MarkdownPreview,
  MultipleContentWrapper,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { TitlesFormFields } from './TitlesFormFields';

const { WORK_TITLE, EDITION, TITLES, SUBTITLE, LANGUAGE } = FORM_FIELDS;
const { EDITION: EDITION_HELPER_TEXT } = HELPER_TEXT;

const EditWorkTitle = ({ workId, queryToken, recommended = false }: BaseRecommendedSectionProps) => {
  const { work, updateWork } = useWork(workId, queryToken);

  const placeholder = work?.title;
  const showIndicator = recommended && !placeholder;

  const updateTitles = (data: WorkTitlesForm) => {
    const { [TITLES.name]: titles, [EDITION.name]: edition } = data;

    const title = titles.length > 0 ? titles[0][WORK_TITLE.name] : work?.title;
    const subtitle = titles.length > 0 ? titles[0][SUBTITLE.name] : work?.subtitle;

    updateWork({ ...work, title: title ?? '', subtitle: subtitle ?? '', edition: edition ?? 1 });
  };

  return (
    <EditableContent
      formId={IDs.WORK_TITLE}
      defaultValues={{
        [TITLES.name]: [
          {
            titleId: appConfig.defaultId,
            [WORK_TITLE.name]: work?.title,
            [SUBTITLE.name]: work?.subtitle,
            [LANGUAGE.name]: languageOptionsAlt[0],
          },
        ],
        [EDITION.name]: work?.edition ?? 1,
      }}
      validationSchema={workTitlesValidationSchema}
      onSubmit={updateTitles}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <TitlesFormFields
            control={control as unknown as Control<WorkTitlesForm>}
            recommended={showIndicator}
            isHelperTextVisible={isHelperTextVisible}
          />
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
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_TITLE.label} value={placeholder ?? ''} onEdit={onEdit} recommended={showIndicator}>
          <div className="lg:ml-2">
            <MarkdownPreview source={placeholder} />
          </div>
        </Preview>
      )}
    />
  );
};

export default EditWorkTitle;
