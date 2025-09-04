import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ReactNode } from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@/components';

export type FormAccordionSectionProps = {
  title: string;
  children?: Readonly<ReactNode>;
  expandIcon?: ReactNode;
  panelId?: string;
};

const defaultIcon = <ExpandMoreIcon color="primary" />;

export const FormAccordionSection = (props: FormAccordionSectionProps) => {
  const { title, children, expandIcon = defaultIcon, panelId = 'panel' } = props;

  return (
    <Accordion
      id={panelId}
      key={panelId}
      className="rounded-2xl bg-[var(--color-background-alt)] p-8 shadow-xl before:hidden"
    >
      <AccordionSummary
        expandIcon={expandIcon}
        aria-controls={`${panelId}-content`}
        id={`${panelId}-header`}
        sx={{
          '&.MuiButtonBase-root.MuiAccordionSummary-root': { padding: 0, minHeight: 'max-content' },
          '& .MuiAccordionSummary-content': {
            margin: 0,
          },
        }}
      >
        <Typography variant="h2" component="h2">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className="mt-8 p-0">{children}</AccordionDetails>
    </Accordion>
  );
};
