import { Paper } from '@/src/shared/ui';

export const ChartWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return (
    <Paper
      elevation={1}
      component="div"
      className="w-full max-w-[33rem] rounded-xl bg-[var(--color-background-alt)] p-4"
    >
      <div className="wrap flex justify-between gap-1">{children}</div>
    </Paper>
  );
};
