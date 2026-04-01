import { mergeStyles } from '@/src/shared/utils';

import Backdrop from '../../Backdrop/Backdrop';
import CircularProgress from '../../CircularProgress/CircularProgress';

type CardsListBackdropProps = {
  loading: boolean;
  className?: string;
};

export const CardsListBackdrop = (props: CardsListBackdropProps) => {
  const { loading, className } = props;

  return (
    <Backdrop
      open={loading}
      className={mergeStyles('absolute h-full w-full bg-white/50', className)}
    >
      <CircularProgress />
    </Backdrop>
  );
};
