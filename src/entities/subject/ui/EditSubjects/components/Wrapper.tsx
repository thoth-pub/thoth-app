import { JSX, ReactNode } from 'react';

export const Wrapper = ({ component, children }: { component?: JSX.ElementType; children: Readonly<ReactNode> }) => {
  const Component = component ?? 'div';

  return <Component className="flex flex-col gap-4">{children}</Component>;
};
