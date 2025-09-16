import { type ReactNode } from 'react';

type AutocompleteGroupProps = {
  group: string;
  children: Readonly<ReactNode>;
};

const AutocompleteGroup = ({ group, children }: AutocompleteGroupProps) => {
  return (
    <li>
      <div className="text-center font-bold">{group}</div>
      <div>{children}</div>
    </li>
  );
};

export default AutocompleteGroup;
