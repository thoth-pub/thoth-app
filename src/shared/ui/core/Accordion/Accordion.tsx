import Accordion, { type AccordionProps } from '@mui/material/Accordion';

const AccordionComponent = ({ children, ...props }: AccordionProps) => {
  return <Accordion {...props}>{children}</Accordion>;
};

export default AccordionComponent;
