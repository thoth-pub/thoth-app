import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

type DragAndDropListenerProps = Partial<{
  isDisabled?: boolean;
  listeners: SyntheticListenerMap;
}>;

const DragAndDropListener = (props: DragAndDropListenerProps) => {
  const { isDisabled = false, listeners } = props;

  return (
    <DragIndicatorIcon
      className={`my-auto ${isDisabled ? '!w-0 !opacity-0' : 'w-0 opacity-0 transition-all duration-300 ease-in-out group-hover:w-max group-hover:opacity-100'}`}
      color="primary"
      fontSize="small"
      {...(isDisabled ? undefined : listeners)}
    />
  );
};

export default DragAndDropListener;
