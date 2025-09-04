import { IDs } from '@/constants';

import { FormAccordionSection } from './FormAccordionSection';

const { BASIC_DETAILS } = IDs.FORM_SECTIONS;

export const BasicDetailsForm = () => {
  return (
    <FormAccordionSection title="Basic Details" panelId={BASIC_DETAILS}>
      Basic Details
    </FormAccordionSection>
  );
};
