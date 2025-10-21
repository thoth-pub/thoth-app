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
        'h-[7.5rem] max-h-[7.5rem] w-full max-w-[330px] rounded-xl bg-[var(--color-background-alt)] p-3 lg:h-[10rem] lg:max-h-[10rem] lg:max-w-[520px]',
        className,
      )}
    >
      {children}
    </Paper>
  );
};

export default DashboardContentWrapper;
