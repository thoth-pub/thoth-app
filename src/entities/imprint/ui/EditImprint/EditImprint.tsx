import { appConfig, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, DeleteButton, FormFieldWithControlsWrapper, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { ImprintId } from '../../model/imprint.types';
import { imprintValidationSchema } from '../../model/imprint.validation';

type EditImprintProps = Partial<{
  defaultValue: string;
  id: ImprintId;
  disabled: boolean;
  deleteDisabled: boolean;
  onUpdate: ({ imprintName, imprintId }: { imprintName: string; imprintId: string }) => void;
  onDelete: (imprintId: ImprintId) => void;
}>;

const { IMPRINT } = FORM_FIELDS;

const { EDIT_IMPRINT } = HELPER_TEXT;

const EditImprint = (props: EditImprintProps) => {
  const { defaultValue = '', id = '', onUpdate, onDelete, deleteDisabled = false } = props;

  const isDeleteDisabled = defaultValue.length === 0 || id.length === 0 || id === appConfig.defaultId || deleteDisabled;

  return (
    <EditableContent
      formId={IDs.IMPRINT(id)}
      validationSchema={imprintValidationSchema}
      defaultValues={{ [IMPRINT.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.({ imprintName: data[IMPRINT.name], imprintId: id })}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldWithControlsWrapper>
            <FormTextField
              control={control}
              name={IMPRINT.name}
              id={IMPRINT.name}
              helperText={EDIT_IMPRINT}
              isHelperTextVisible={isHelperTextVisible}
              fullWidth
            />
            <DeleteButton onClick={() => onDelete?.(id)} disabled={isDeleteDisabled} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => <Preview value={defaultValue} disabled={disabled} onEdit={onEdit} />}
    />
  );
};
export default EditImprint;
