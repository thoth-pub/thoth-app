import Typography, { type TypographyProps } from '@mui/material/Typography';

const TypographyComponent = ({ children, ...props }: TypographyProps) => {
  return <Typography {...props}>{children}</Typography>;
};

export default TypographyComponent;
