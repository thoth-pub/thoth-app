import { EditFundingForm } from '@/src/entities/funding';

type AddFundingProps = {
  onDone?: () => void;
  onClose?: () => void;
};

const AddFunding = (props: AddFundingProps) => {
  const { onDone, onClose } = props;

  return <EditFundingForm onDone={onDone} onClose={onClose} />;
};

export default AddFunding;
