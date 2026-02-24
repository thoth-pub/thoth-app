import Grid from "../../core/Grid/Grid";

type DashboardGridProps = {
  children: Readonly<React.ReactNode>;
};

const DashboardGrid = ({ children }: DashboardGridProps) => {
  return (
    <Grid
      container
      spacing={{ xs: 1, xl: 2 }}
      sx={{
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }}
    >
      {children}
    </Grid>
  );
};

export default DashboardGrid;
