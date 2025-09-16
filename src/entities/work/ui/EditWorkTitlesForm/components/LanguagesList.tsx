import { convertLanguageCode } from '@/src/shared';
import { Chip } from '@/src/shared/ui';

type LanguagesListProps = {
  list: string[];
};

export const LanguagesList = ({ list }: LanguagesListProps) => {
  const updatedList = list.map(convertLanguageCode);

  return (
    <ul className="wrap mt-3 ml-6 flex gap-1">
      {updatedList.map((item) => (
        <Chip key={item} label={item} size="small" component="li" />
      ))}
    </ul>
  );
};
