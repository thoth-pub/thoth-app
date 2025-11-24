import { mergeStyles } from '@/src/shared';
import { Paper } from '@/src/shared/ui';

type DashboardContentWrapperProps = {
  children: Readonly<React.ReactNode>;
  className?: string;
};

const DashboardContentWrapper = ({ children, className }: DashboardContentWrapperProps) => {
  return (
    <Paper
      elevation={3}
      component="div"
      className={mergeStyles(
        'h-[7.5rem] max-h-[7.5rem] w-full max-w-[270px] rounded-xl bg-[var(--color-background-alt)] p-3 xl:h-[10rem] xl:max-h-[10rem] xl:max-w-[520px]',
        className,
      )}
    >
      {children}
    </Paper>
  );
};

export default DashboardContentWrapper;
