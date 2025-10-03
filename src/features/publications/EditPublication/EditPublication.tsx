import { EditPublication as EditPublicationForm } from '@/src/entities/publication';
import type { BaseEditSectionProps } from '@/src/shared';

const EditPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  return <EditPublicationForm title="Edit Publication" onDone={() => {}} onClose={() => {}} />;
};

export default EditPublication;
