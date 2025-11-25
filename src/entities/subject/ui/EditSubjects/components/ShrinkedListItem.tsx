import {
  convertBicSubjectCodeToReadableFormat,
  convertBisacSubjectCodeToReadableFormat,
  convertThemaSubjectCodeToReadableFormat,
  SubjectTypes,
} from '@/src/shared';
import { SubjectEntity, SubjectType } from '../../../model/subject.types';
import { Chip, Typography } from '@/src/shared/ui';

type ShrinkedListItemProps = {
  subjects: SubjectEntity[];
  type: SubjectType;
};

export const ShrinkedListItem = ({ subjects, type }: ShrinkedListItemProps) => {
  const data = subjects.map((subject) => subject.code);

  const bisacReadableData = data.map((code) => convertBisacSubjectCodeToReadableFormat(code));
  const bicReadableData = data.map((code) => convertBicSubjectCodeToReadableFormat(code));
  const themaReadableData = data.map((code) => convertThemaSubjectCodeToReadableFormat(code));

  const isBisac = type === SubjectTypes.enum.Bisac;
  const isBic = type === SubjectTypes.enum.Bic;
  const isThema = type === SubjectTypes.enum.Thema;

  const isDefault = !isBisac && !isBic && !isThema;

  return (
    <Typography className="flex items-center gap-1">
      <Chip label={type} size="small" component="span" />
      {isDefault && data.join(', ')}
      {isBisac && bisacReadableData.join(', ')}
      {isBic && bicReadableData.join(', ')}
      {isThema && themaReadableData.join(', ')}
    </Typography>
  );
};
