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
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

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

  const placeholder = '';
  const showIndicator = recommended && !placeholder;

  const defaultValues = {
    [TITLES.name]: [
      {
        titleId: appConfig.defaultId,
        [WORK_TITLE.name]: '',
        [SUBTITLE.name]: '',
        [LANGUAGE.name]: languageOptionsAlt[0],
      },
    ],
    [EDITION.name]: work?.edition ?? 1,
  };

  const updateTitles = (data: WorkTitlesForm) => {
    const { [TITLES.name]: _titles, [EDITION.name]: edition } = data;

    // TODO: update titles

    updateWork({ ...work, titles: [], edition: edition ?? 1 });
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
          <Typography className={placeholder.length > 0 ? 'lg:ml-2' : ''} component="span">
            <MarkdownPreview source={placeholder} />
          </Typography>
        </Preview>
      )}
    />
  );
};

export default EditWorkTitle;
