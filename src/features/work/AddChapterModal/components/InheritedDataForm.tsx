import { useForm } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, Checkbox, CheckboxFormField, FormFieldLabel, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type InheritedDataFormProps = {
  onSubmit: (data: {
    landingPage: boolean;
    license: boolean;
    copyrightHolder: boolean;
    contributors: boolean;
    fundings: boolean;
    subjects: boolean;
  }) => void;
};

const { COPYRIGHT_HOLDER, LICENSE, SUBJECTS, IMPRINT, WORK_STATUS } = FORM_FIELDS;

const itemStyles = 'max-w-fit p-0';
const labelStyles = 'min-w-45 lg:min-w-55 capitalize';
const wrapperStyles = 'flex items-center gap-2';

export const InheritedDataForm = (props: InheritedDataFormProps) => {
  const { onSubmit } = props;

  const { control, handleSubmit } = useForm({
    defaultValues: {
      landingPage: false,
      license: false,
      copyrightHolder: false,
      contributors: false,
      fundings: false,
      subjects: false,
    },
  });

  return (
    <ContentSection
      title={<TranslatedContent content="inherited work data" />}
      headerContent={
        <Button variant="contained" className="mt-4 capitalize" onClick={handleSubmit(onSubmit)}>
          <TranslatedContent content="actions.create" />
        </Button>
      }
    >
      <form className="pl-4">
        <ul className="flex flex-col gap-2">
          <div className={wrapperStyles}>
            <FormFieldLabel label={WORK_STATUS.label} namespace={NAMESPACES.enum.common} className={labelStyles} />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label="cover" className={labelStyles} namespace={NAMESPACES.enum.common} />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label={IMPRINT.label} className={labelStyles} />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label="Place" className={labelStyles} />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label="landing page" className={labelStyles} namespace={NAMESPACES.enum.common} />
            <CheckboxFormField control={control} name="landingPage" className={itemStyles} />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label={LICENSE.label} className={labelStyles} />
            <CheckboxFormField control={control} name="license" className={itemStyles} />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label={COPYRIGHT_HOLDER.label} className={labelStyles} />
            <CheckboxFormField control={control} name="copyrightHolder" className={itemStyles} />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label={SUBJECTS.label} className={labelStyles} />
            <CheckboxFormField control={control} name="subjects" className={itemStyles} />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label="contributors" className={labelStyles} namespace={NAMESPACES.enum.common} />
            <CheckboxFormField control={control} name="contributors" className={itemStyles} />
          </div>
          <div className={wrapperStyles}>
            <FormFieldLabel label="funding" className={labelStyles} namespace={NAMESPACES.enum.common} />
            <CheckboxFormField control={control} name="funding" className={itemStyles} />
          </div>
        </ul>
      </form>
    </ContentSection>
  );
};
