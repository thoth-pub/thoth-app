import { mergeStyles } from '@/src/shared';
import { Paper } from '@/src/shared/ui';

type DashboardContentWrapperProps = {
  children: Readonly<React.ReactNode>;
  className?: string;
};

const DashboardContentWrapper = ({ children, className }: DashboardContentWrapperProps) => {
  return (
    <Paper
      elevation={1}
      component="div"
      className={mergeStyles(
        'h-[10rem] max-h-[10rem] w-full max-w-[520px] rounded-xl bg-[var(--color-background-alt)] p-4',
        className,
      )}
    >
      {children}
    </Paper>
  );
};

export default DashboardContentWrapper;
