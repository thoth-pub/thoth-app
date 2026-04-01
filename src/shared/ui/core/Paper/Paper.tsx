import Paper, { type PaperProps } from '@mui/material/Paper';

const PaperComponent = ({ children, ...props }: PaperProps) => {
  return <Paper {...props}>{children}</Paper>;
};

export default PaperComponent;
