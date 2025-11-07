import { Button, Checkbox, CheckboxFormField, FormFieldLabel } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useForm } from 'react-hook-form';

const itemStyles = 'max-w-fit p-0';

type InheritedDataFormProps = {
  onSubmit: (data: { license: boolean; copyrightHolder: boolean; contributors: boolean; fundings: boolean }) => void;
};

export const InheritedDataForm = (props: InheritedDataFormProps) => {
  const { onSubmit } = props;

  const { control, handleSubmit } = useForm({
    defaultValues: {
      license: false,
      copyrightHolder: false,
      contributors: false,
      fundings: false,
    },
  });

  return (
    <ContentSection
      title="Inherited work data"
      headerContent={
        <Button variant="contained" className="mt-4 capitalize" onClick={handleSubmit(onSubmit)}>
          create
        </Button>
      }
    >
      <form className="pl-4">
        <ul className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Status" className="min-w-30 lg:min-w-40" />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Cover" className="min-w-30 lg:min-w-40" />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Landing page" className="min-w-30 lg:min-w-40" />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Imprint" className="min-w-30 lg:min-w-40" />
            <Checkbox className={itemStyles} checked disabled />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="License" className="min-w-30 lg:min-w-40" />
            <CheckboxFormField control={control} name="license" className={itemStyles} />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Copyright holder" className="min-w-30 lg:min-w-40" />
            <CheckboxFormField control={control} name="copyrightHolder" className={itemStyles} />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Contributors" className="min-w-30 lg:min-w-40" />
            <CheckboxFormField control={control} name="contributors" className={itemStyles} />
          </div>
          <div className="flex items-center gap-2">
            <FormFieldLabel label="Fundings" className="min-w-30 lg:min-w-40" />
            <CheckboxFormField control={control} name="fundings" className={itemStyles} />
          </div>
        </ul>
      </form>
    </ContentSection>
  );
};
