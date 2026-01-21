import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { BaseEditSectionProps, SubjectTypes } from "@/src/shared";
import { bicFormFields } from "@/src/shared/constants/bicFormFields";
import { bisacFormFields } from "@/src/shared/constants/bisacFormFields";
import { FORM_FIELDS } from "@/src/shared/constants/formFields";
import { themaFormFields } from "@/src/shared/constants/themaFormFields";
import useFormStateMachine from "@/src/shared/store/forms/hooks/useFormStateMachine";
import { AutocompleteField, CloseButton, FormTextField, SubmitButton } from "@/src/shared/ui";

import useUpdateSubject from "../../api/hooks/useUpdateSubject";
import { subjectAltValidationSchema, subjectValidationSchema } from "../../model/subject.validation";
import useSubjectStateMachine from "../../store/hooks/useSubjectStateMachine";

const { SUBJECT_CODE, SUBJECT_CODE_ALT } = FORM_FIELDS;

const fieldsOptions = {
  [SubjectTypes.enum.Bic]: bicFormFields,
  [SubjectTypes.enum.Bisac]: bisacFormFields,
  [SubjectTypes.enum.Thema]: themaFormFields,
  [SubjectTypes.enum.Custom]: [],
  [SubjectTypes.enum.Keyword]: [],
  [SubjectTypes.enum.Lcc]: [],
};

const formStyles = 'w-full flex gap-2';

export const EditSubject = ({ workId }: BaseEditSectionProps) => {
  const { activeSubject, close } = useSubjectStateMachine();
  const { close: closeForm } = useFormStateMachine();
  const { updateSubject } = useUpdateSubject({ workId });

  const fieldOptions = activeSubject ? fieldsOptions[activeSubject.type] : fieldsOptions[SubjectTypes.enum.Custom];

  const codeOptions = fieldOptions.find((option) => option.value === activeSubject?.code);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(subjectValidationSchema),
    defaultValues: {
      [SUBJECT_CODE.name]: codeOptions ?? fieldOptions[0],
    },
  });

  const { control: controlAlt, handleSubmit: handleSubmitAlt } = useForm({
    resolver: zodResolver(subjectAltValidationSchema),
    defaultValues: {
      [SUBJECT_CODE_ALT.name]: activeSubject?.code,
    },
  });

  const onClose = () => {
    closeForm();
    close();
  };

  const onSubmit = (data: { subjectCode: { value: string; label: string; }; }) => {
    if (!activeSubject) return;

    updateSubject({ ...activeSubject, code: data.subjectCode.value });
    onClose();
  };

  const onSubmitAlt = (data: { subjectCodeAlt?: string | undefined; }) => {
    if (!activeSubject) return;

    updateSubject({ ...activeSubject, code: data.subjectCodeAlt ?? '' });
    onClose();
  };



  return (
    <>
      {fieldOptions.length > 0 ? (
        <form className={formStyles} onSubmit={handleSubmit(onSubmit)}>
          <AutocompleteField
            name={SUBJECT_CODE.name}
            control={control}
            freeSolo={fieldOptions?.length === 0}
            id={SUBJECT_CODE.name}
            options={fieldOptions}
            fullWidth
          />
          <SubmitButton type="submit" />
          <CloseButton onClose={onClose} />
        </form>
      ) : (
        <form className={formStyles} onSubmit={handleSubmitAlt(onSubmitAlt)}>
          <FormTextField
            name={SUBJECT_CODE_ALT.name}
            control={controlAlt}
            id={SUBJECT_CODE_ALT.name}
            fullWidth
          />
          <SubmitButton type="submit" />
          <CloseButton onClose={onClose} />
        </form>
      )
      }
    </>
  );
};