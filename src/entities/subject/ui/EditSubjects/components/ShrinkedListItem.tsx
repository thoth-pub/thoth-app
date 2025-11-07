import { SubjectEntity, SubjectType } from '../../../model/subject.types';
import { Chip, Typography } from '@/src/shared/ui';

type ShrinkedListItemProps = {
  subjects: SubjectEntity[];
  type: SubjectType;
};

export const ShrinkedListItem = ({ subjects, type }: ShrinkedListItemProps) => {
  const data = subjects.map((subject) => subject.code);

  return (
    <Typography className="flex items-center gap-1">
      <Chip label={type} size="small" component="span" />
      {data.join(', ')}
    </Typography>
  );
};
