import { Button, CheckboxFormField, ContentWrapper, FormFieldLabel, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useForm } from 'react-hook-form';

const itemStyles = 'max-w-fit p-0';

type InheritedDataFormProps = {
  onSubmit: (data: { license: boolean; copyrightHolder: boolean }) => void;
};

export const InheritedDataForm = (props: InheritedDataFormProps) => {
  const { onSubmit } = props;

  const { control, handleSubmit } = useForm({
    defaultValues: {
      license: false,
      copyrightHolder: false,
    },
  });

  return (
    <ContentSection
      title="Inherited work data"
      headerContent={
        <Button variant="contained" className="mt-4 capitalize" onClick={handleSubmit(onSubmit)}>
          Continue
        </Button>
      }
    >
      <form className="pl-4">
        <ul className="flex flex-col gap-2">
          <ContentWrapper>
            <FormFieldLabel label="License" />
            <CheckboxFormField control={control} name="license" className={itemStyles} />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label="Copyright holder" />
            <CheckboxFormField control={control} name="copyrightHolder" className={itemStyles} />
          </ContentWrapper>
        </ul>
      </form>
    </ContentSection>
  );
};
