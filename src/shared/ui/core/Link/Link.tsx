import Link, { type LinkProps } from '@mui/material/Link';

const LinkComponent = ({ children, ...props }: LinkProps) => {
  return <Link {...props}>{children}</Link>;
};

export default LinkComponent;
