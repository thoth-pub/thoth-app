import { useWork } from '@/src/entities/work';
import { AbstractsForm } from '@/src/entities/work/model/work.types';
import { abstractValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { WORK_ABSTRACTS, WORK_ABSTRACT, WORK_SHORT_ABSTRACT } = FORM_FIELDS;
const { WORK_ABSTRACT: WORK_ABSTRACT_HELPER_TEXT, WORK_SHORT_ABSTRACT: WORK_SHORT_ABSTRACT_HELPER_TEXT } = HELPER_TEXT;

export const EditAbstracts = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const handleSubmit = (data: AbstractsForm) => {
    const { abstract = '', shortAbstract = '' } = data;

    updateWork({ ...work, longAbstract: abstract, shortAbstract });
  };

  const placeholderValue =
    work.longAbstract && work.longAbstract.length > 0
      ? `${work.shortAbstract} \n ${work.longAbstract}`
      : `${work.shortAbstract}`;

  return (
    <EditableContent
      formId={IDs.WORK_ABSTRACT}
      defaultValues={{ [WORK_ABSTRACT.name]: work.longAbstract }}
      validationSchema={abstractValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_ABSTRACT.label} id={WORK_ABSTRACT.name} />
            <FormTextField
              control={control}
              name={WORK_ABSTRACT.name}
              helperText={WORK_ABSTRACT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_ABSTRACT.type}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_SHORT_ABSTRACT.label} id={WORK_SHORT_ABSTRACT.name} />
            <FormTextField
              control={control}
              name={WORK_SHORT_ABSTRACT.name}
              helperText={WORK_SHORT_ABSTRACT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WORK_SHORT_ABSTRACT.type}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => <Preview label={WORK_ABSTRACTS.label} value={placeholderValue} onEdit={onEdit} />}
    />
  );
};
