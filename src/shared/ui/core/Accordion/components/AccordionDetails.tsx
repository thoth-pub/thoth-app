import AccordionDetails, { type AccordionDetailsProps } from '@mui/material/AccordionDetails';

const AccordionDetailsComponent = ({ children, ...props }: AccordionDetailsProps) => {
  return <AccordionDetails {...props}>{children}</AccordionDetails>;
};

export default AccordionDetailsComponent;
