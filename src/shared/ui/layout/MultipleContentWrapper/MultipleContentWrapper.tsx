import React from 'react';

const MultipleContentWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return <div className="flex flex-col gap-[var(--default-gap)]">{children}</div>;
};

export default MultipleContentWrapper;
