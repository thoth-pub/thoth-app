'use client';

import { useWork } from '@/src/entities/work';
import { DoiAndCoversForm, type WorkId } from '@/src/entities/work/model/work.types';
import { doiAndCoversValidationSchema } from '@/src/entities/work/model/work.validation';
import { HELPER_TEXT, IDs, type QueryToken } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditDoiProps = {
  workId: WorkId;
  queryToken: QueryToken;
  isRecommended?: boolean;
};

const { DOI, LANDING_PAGE, COVER_URL } = FORM_FIELDS;

export const EditDoi = ({ workId, queryToken, isRecommended = false }: EditDoiProps) => {
  const { work, updateWorkRef } = useWork(workId, queryToken);

  const doiValue = work?.doi ?? '';
  const landingPageValue = work?.landingPage ?? '';
  const coverUrlValue = work?.coverUrl ?? '';

  const showDoiIndicator = isRecommended && !work?.doi;
  const showLandingPageIndicator = isRecommended && !work?.landingPage;
  const showCoverUrlIndicator = isRecommended && !work?.coverUrl;

  const placeholderValue = [doiValue, landingPageValue, coverUrlValue].filter((value) => value.length > 0).join(', ');

  const updateImprint = ({ doi, landingPage, coverUrl }: DoiAndCoversForm) => {
    updateWorkRef({ ...work, doi: doi ?? '', landingPage, coverUrl });
  };

  return (
    <EditableContent
      formId={IDs.WORK_DOI_AND_COVERS}
      defaultValues={{
        [DOI.name]: doiValue,
        [LANDING_PAGE.name]: landingPageValue,
        [COVER_URL.name]: coverUrlValue,
      }}
      validationSchema={doiAndCoversValidationSchema}
      onSubmit={updateImprint}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={DOI.label} id={DOI.name} isRecommended={showDoiIndicator} />
            <FormTextField
              control={control}
              name={DOI.name}
              fullWidth
              helperText={HELPER_TEXT.DOI}
              isHelperTextVisible={isHelperTextVisible}
              isDoiField
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel
              label={LANDING_PAGE.label}
              id={LANDING_PAGE.name}
              isRecommended={showLandingPageIndicator}
            />
            <FormTextField
              control={control}
              name={LANDING_PAGE.name}
              fullWidth
              helperText={HELPER_TEXT.LANDING_PAGE}
              isHelperTextVisible={isHelperTextVisible}
              isUrlField
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={COVER_URL.label} id={COVER_URL.name} isRecommended={showCoverUrlIndicator} />
            <FormTextField
              control={control}
              name={COVER_URL.name}
              fullWidth
              helperText={HELPER_TEXT.COVER_URL}
              isHelperTextVisible={isHelperTextVisible}
              isUrlField
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          label={DOI.label}
          value={placeholderValue}
          isRecommended={showDoiIndicator || showLandingPageIndicator || showCoverUrlIndicator}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditDoi;
