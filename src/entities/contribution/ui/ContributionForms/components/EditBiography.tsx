/* eslint-disable @typescript-eslint/no-unused-vars */
import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, MarkdownField, MarkdownPreview, MarkdownSwitch, Preview, Typography } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { BiographyEntity, ContributionBiographyForm } from '../../../model/contribution.types';
import { contributorBiographyValidationSchema } from '../../../model/contribution.validation';

const { CONTRIBUTOR_BIOGRAPHY } = FORM_FIELDS;
const { CONTRIBUTOR_BIOGRAPHY: CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT } = HELPER_TEXT;

type EditBiographyProps = {
  biographies: BiographyEntity[];
  recommended?: boolean;
  onSubmit: (data: ContributionBiographyForm) => void;
};

export const EditBiography = (props: EditBiographyProps) => {
  const { biographies, recommended = false, onSubmit } = props;

  const showPreviewIndicator = recommended && biographies.length === 0;

  return <p>EditBiography</p>;

  // return (
  //   <EditableContent
  //     isTableVariant
  //     formId={IDs.CONTRIBUTOR_BIOGRAPHY}
  //     defaultValues={{ [CONTRIBUTOR_BIOGRAPHY.name]: biography }}
  //     validationSchema={contributorBiographyValidationSchema}
  //     onSubmit={onSubmit}
  //     borderTransparent
  //     formFields={({ control, isHelperTextVisible }) => (
  //       <ContentWrapper>
  //         <FormFieldLabel
  //           label={CONTRIBUTOR_BIOGRAPHY.label}
  //           id={CONTRIBUTOR_BIOGRAPHY.name}
  //           recommended={showPreviewIndicator}
  //         />
  //         <MarkdownField
  //           extendedToolbar
  //           name={CONTRIBUTOR_BIOGRAPHY.name}
  //           control={control}
  //           helperText={isHelperTextVisible ? CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT : ''}
  //           id={CONTRIBUTOR_BIOGRAPHY.name}
  //         >
  //           <MarkdownSwitch />
  //         </MarkdownField>
  //       </ContentWrapper>
  //     )}
  //     preview={({ data, disabled, onEdit }) => (
  //       <Preview
  //         label={CONTRIBUTOR_BIOGRAPHY.label}
  //         value={biography}
  //         disabled={disabled}
  //         onEdit={onEdit}
  //         recommended={showPreviewIndicator}
  //       >
  //         {biography && (
  //           <Typography component="span">
  //             <MarkdownPreview source={data?.contributorBiography} />
  //           </Typography>
  //         )}
  //       </Preview>
  //     )}
  //   />
  // );
};
