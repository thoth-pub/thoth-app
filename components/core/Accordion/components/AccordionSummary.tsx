import AccordionSummary, { type AccordionSummaryProps } from '@mui/material/AccordionSummary';

const AccordionSummaryComponent = ({ children, ...props }: AccordionSummaryProps) => {
  return <AccordionSummary {...props}>{children}</AccordionSummary>;
};

export default AccordionSummaryComponent;
