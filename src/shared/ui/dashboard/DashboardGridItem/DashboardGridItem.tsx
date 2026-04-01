import { mergeStyles } from '@/src/shared/utils';

import Grid from '../../core/Grid/Grid';
import Paper from '../../core/Paper/Paper';

type DashboardGridItemProps = {
  children: Readonly<React.ReactNode>;
  className?: string;
};

const DashboardGridItem = ({ children, className }: DashboardGridItemProps) => {
  return (
    <Grid minWidth={270} maxWidth={520} size={4}>
      <Paper
        elevation={3}
        component="div"
        className={mergeStyles(
          'h-30 max-h-30 rounded-xl bg-(--color-background-alt) p-3 xl:h-40 xl:max-h-40',
          className,
        )}
      >
        {children}
      </Paper>
    </Grid>
  );
};

export default DashboardGridItem;
