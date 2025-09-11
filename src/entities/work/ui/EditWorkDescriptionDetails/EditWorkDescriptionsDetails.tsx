import { IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

const { DESCRIPTIONS_DETAILS } = IDs.FORM_SECTIONS;

const EditWorkDescriptionsDetails = () => {
  return (
    <AccordionSection title="Descriptions" panelId={DESCRIPTIONS_DETAILS}>
      Descriptions Details
    </AccordionSection>
  );
};

export default EditWorkDescriptionsDetails;
