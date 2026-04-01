import { type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

const FormFieldWithControlsWrapper = ({
  children,
  className,
}: {
  children: Readonly<ReactNode>;
  className?: string;
}) => {
  return <div className={twMerge(`flex gap-1`, className)}>{children}</div>;
};

export default FormFieldWithControlsWrapper;
