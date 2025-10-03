import { EditPublication } from '@/src/entities/publication';
import type { BaseEditSectionProps } from '@/src/shared';

const AddNewPublication = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  return <EditPublication title="Add New Publication" />;
};

export default AddNewPublication;
