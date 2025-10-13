import { EditFundingForm } from '@/src/entities/funding';

type EditFundingProps = {
  onDone?: () => void;
  onClose?: () => void;
};

const EditFunding = (props: EditFundingProps) => {
  const { onDone, onClose } = props;

  return <EditFundingForm onDone={onDone} onClose={onClose} />;
};

export default EditFunding;
