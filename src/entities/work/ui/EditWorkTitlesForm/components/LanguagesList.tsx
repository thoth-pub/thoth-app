import { Chip } from '@/src/shared/ui';

type LanguagesListProps = {
  list: string[];
};

export const LanguagesList = ({ list }: LanguagesListProps) => {
  const updatedList = list.map((item) => {
    const [start, end] = item.split('_');

    if (!end) return start;

    return `${start}-${end.toUpperCase()}`;
  });

  return (
    <ul className="wrap mt-3 ml-6 flex gap-1">
      {updatedList.map((item) => (
        <Chip key={item} label={item} size="small" component="li" />
      ))}
    </ul>
  );
};
