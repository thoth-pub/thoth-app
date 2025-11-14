import { Button } from '@/src/shared/ui';

type PreviewStepProps = {
  onPreviousStep: () => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { onPreviousStep } = props;

  return (
    <div>
      <Button onClick={onPreviousStep}>Previous Step</Button>
    </div>
  );
};
