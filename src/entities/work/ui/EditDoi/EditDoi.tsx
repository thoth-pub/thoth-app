'use client';

import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { DoiAndCoversForm } from '@/src/entities/work/model/work.types';
import { doiAndCoversValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, convertDoiToText, getProtocolPrefix, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  DoiLogo,
  FormTextField,
  Link,
  LinkTooltip,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { DOI, LANDING_PAGE, COVER_URL } = FORM_FIELDS;

type EditDoiProps = BaseRecommendedSectionProps & {
  isChapter?: boolean;
};

const EditDoi = (props: EditDoiProps) => {
  const { workId, queryToken, recommended = false, isChapter = false } = props;

  const { work, updateWork } = useWork(workId, queryToken);
  const { isDoiRequired, isLandingPageRequired, isCoverUrlRequired } = useWorkRecommendations({ workId });

  const doiValue = work?.doi ?? '';
  const landingPageValue = work?.landingPage ?? '';
  const coverUrlValue = work?.coverUrl ?? '';

  const isAnyValueFilled = doiValue.length > 0 || landingPageValue.length > 0 || coverUrlValue.length > 0;

  const showDoiIndicator = recommended && isDoiRequired;
  const showLandingPageIndicator = recommended && isLandingPageRequired;
  const showCoverUrlIndicator = recommended && isCoverUrlRequired;

  const workPlaceholderValue = [doiValue, landingPageValue, coverUrlValue]
    .filter((value) => value.length > 0)
    .join(', ');
  const chapterPlaceholderValue = [doiValue].filter((value) => value.length > 0).join(', ');

  const updateImprint = ({ doi, landingPage, coverUrl }: DoiAndCoversForm) => {
    updateWork({ ...work, doi: doi ?? '', landingPage, coverUrl });
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
            <FormFieldLabel label={DOI.label} id={DOI.name} recommended={showDoiIndicator} />
            <FormTextField
              control={control}
              name={DOI.name}
              id={DOI.name}
              helperText={HELPER_TEXT.DOI}
              isHelperTextVisible={isHelperTextVisible}
              isDoiField
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LANDING_PAGE.label} id={LANDING_PAGE.name} recommended={showLandingPageIndicator} />
            <FormTextField
              control={control}
              name={LANDING_PAGE.name}
              id={LANDING_PAGE.name}
              helperText={HELPER_TEXT.LANDING_PAGE}
              isHelperTextVisible={isHelperTextVisible}
              isUrlField
              predefinedPrefix={getProtocolPrefix(landingPageValue ?? '')}
            />
          </ContentWrapper>

          {!isChapter && (
            <ContentWrapper>
              <FormFieldLabel label={COVER_URL.label} id={COVER_URL.name} recommended={showCoverUrlIndicator} />
              <FormTextField
                control={control}
                name={COVER_URL.name}
                id={COVER_URL.name}
                helperText={HELPER_TEXT.COVER_URL}
                isHelperTextVisible={isHelperTextVisible}
                isUrlField
                predefinedPrefix={getProtocolPrefix(coverUrlValue ?? '')}
              />
            </ContentWrapper>
          )}
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={DOI.label}
          value={isChapter ? chapterPlaceholderValue : workPlaceholderValue}
          recommended={showDoiIndicator || showLandingPageIndicator || showCoverUrlIndicator}
          disabled={disabled}
          onEdit={onEdit}
        >
          {isAnyValueFilled && (
            <ul className="flex items-center gap-1">
              {doiValue.length > 0 && (
                <li className="flex items-center gap-1">
                  <Typography>{convertDoiToText(doiValue)}</Typography>
                  <LinkTooltip link={doiValue} linkText={convertDoiToText(doiValue)}>
                    <DoiLogo />
                  </LinkTooltip>
                </li>
              )}
              {landingPageValue.length > 0 && (
                <li>
                  <LinkTooltip link={landingPageValue} linkText={landingPageValue}>
                    <InsertPhotoIcon color="primary" />
                  </LinkTooltip>
                </li>
              )}
              {coverUrlValue.length > 0 && (
                <li>
                  <LinkTooltip link={coverUrlValue} linkText={coverUrlValue}>
                    <PhotoAlbumIcon color="primary" />
                  </LinkTooltip>
                </li>
              )}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default EditDoi;
