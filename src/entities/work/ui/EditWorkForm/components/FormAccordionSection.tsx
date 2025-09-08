import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ReactNode } from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@/src/shared/ui';

export type FormAccordionSectionProps = {
  title: string;
  children?: Readonly<ReactNode>;
  expandIcon?: ReactNode;
  panelId?: string;
  defaultExpanded?: boolean;
};

const defaultIcon = <ExpandMoreIcon color="primary" />;

export const FormAccordionSection = (props: FormAccordionSectionProps) => {
  const { title, children, expandIcon = defaultIcon, panelId = 'panel', defaultExpanded = false } = props;

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      id={panelId}
      key={panelId}
      className="max-w-[var(--max-form-content-width)] rounded-2xl bg-[var(--color-background-alt)] p-8 shadow-xl before:hidden"
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
