'use client';

import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { DoiAndCoversForm } from '@/src/entities/work/model/work.types';
import { doiAndCoversValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { ContentWrapper, DoiPreview, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { getProtocolPrefix } from '@/src/shared/utils';

const { DOI, LANDING_PAGE } = FORM_FIELDS;

type EditDoiProps = BaseRecommendedSectionProps & {
  isChapter?: boolean;
};

const EditDoi = (props: EditDoiProps) => {
  const { workId, recommended = false, isChapter = false } = props;

  const { work, updateWork } = useWork(workId);
  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });

  const doiValue = work?.doi ?? '';
  const landingPageValue = work?.landingPage ?? '';

  const showDoiIndicator = recommended && isDoiRequired;
  const showLandingPageIndicator = recommended && isLandingPageRequired;

  const workPlaceholderValue = [doiValue, landingPageValue].filter((value) => value.length > 0).join(', ');
  const chapterPlaceholderValue = [doiValue].filter((value) => value.length > 0).join(', ');

  const updateDoiAndLandingPage = ({ doi, landingPage }: DoiAndCoversForm) => {
    updateWork({ ...work, doi: doi ?? '', landingPage });
  };

  return (
    <EditableContent
      formId={IDs.WORK_DOI_AND_COVERS}
      defaultValues={{
        [DOI.name]: doiValue,
        [LANDING_PAGE.name]: landingPageValue,
      }}
      validationSchema={doiAndCoversValidationSchema}
      onSubmit={updateDoiAndLandingPage}
      faq={HELPER_TEXT.DOI}
      formFields={({ control }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={DOI.label} id={DOI.name} recommended={showDoiIndicator} />
            <FormTextField control={control} name={DOI.name} id={DOI.name} helperText={HELPER_TEXT.DOI} isDoiField />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LANDING_PAGE.label} id={LANDING_PAGE.name} recommended={showLandingPageIndicator} />
            <FormTextField
              control={control}
              name={LANDING_PAGE.name}
              id={LANDING_PAGE.name}
              isUrlField
              predefinedPrefix={getProtocolPrefix(landingPageValue ?? '')}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={DOI.label}
          value={isChapter ? chapterPlaceholderValue : workPlaceholderValue}
          recommended={showDoiIndicator || showLandingPageIndicator}
          disabled={disabled}
          onEdit={onEdit}
        >
          {doiValue.length > 0 && <DoiPreview doi={doiValue} />}
        </Preview>
      )}
    />
  );
};

export default EditDoi;
