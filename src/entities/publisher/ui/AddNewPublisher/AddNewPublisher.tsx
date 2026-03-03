'use client';

import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import {
  Button,
  ButtonGroup,
  CloseButton,
  FormFieldLabel,
  FormFieldWrapper,
  FormTextField,
  Modal,
  ModalWrapper,
  SubmitButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

import { useAddNewPublisher } from './useAddNewPublisher';

const { PUBLISHER_NAME } = FORM_FIELDS;
const { NEW_PUBLISHER } = IDs;

const AddNewPublisher = ({ className }: { className?: string }) => {
  const { isOpen, control, submitDisabled, openModal, closeModal, createNewPublisher, handleSubmit } =
    useAddNewPublisher();

  return (
    <>
      <Button
        variant="contained"
        onClick={openModal}
        className={mergeStyles('flex justify-start gap-2 pl-1.5', className)}
        color="primary"
      >
        <PersonAddIcon />
        <TranslatedContent content="actions.addPublisher" />
      </Button>
      <Modal open={isOpen} onClose={closeModal}>
        <ModalWrapper>
          <div className="flex flex-col justify-between gap-(--default-gap)">
            <div className="flex justify-between">
              <Typography variant="h2" component="h3" className="text-(--color-typography) uppercase">
                <TranslatedContent content="actions.addPublisher" />
              </Typography>
              <ButtonGroup className="flex gap-2">
                <SubmitButton type="submit" form={NEW_PUBLISHER} disabled={submitDisabled} />
                <CloseButton onClose={closeModal} />
              </ButtonGroup>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(createNewPublisher)}
            id={NEW_PUBLISHER}
            className="flex flex-col gap-(--default-gap)"
          >
            <FormFieldWrapper>
              <FormFieldLabel label={PUBLISHER_NAME.label} id={PUBLISHER_NAME.name} />
              <FormTextField name={PUBLISHER_NAME.name} control={control} />
            </FormFieldWrapper>
          </form>
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default AddNewPublisher;
