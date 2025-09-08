import { IDs } from '@/constants';

import { FormAccordionSection } from './FormAccordionSection';

const { DESCRIPTIONS_DETAILS } = IDs.FORM_SECTIONS;

export const WorkDescriptionsDetailsForm = () => {
  return (
    <FormAccordionSection title="Descriptions" panelId={DESCRIPTIONS_DETAILS}>
      Descriptions Details
    </FormAccordionSection>
  );
};
