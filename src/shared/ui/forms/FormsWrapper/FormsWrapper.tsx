import type { ReactNode } from 'react';

const FormsWrapper = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-4">{children}</div>;
};

export default FormsWrapper;
