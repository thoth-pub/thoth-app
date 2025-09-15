import { IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

const EditWorkContributors = () => {
  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS}>
      Contributors
    </AccordionSection>
  );
};

export default EditWorkContributors;
