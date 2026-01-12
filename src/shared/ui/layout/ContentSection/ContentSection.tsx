import { Paper } from '@mui/material';
import { ReactNode } from 'react';

import { mergeStyles } from '@/src/shared';

import Typography from '../../core/Typography/Typography';

type ContentSectionProps = Partial<{
  title: string;
  children: Readonly<ReactNode>;
  className: string;
  headerContent: Readonly<ReactNode>;
  id: string;
}>;

const ContentSection = ({ children, title, headerContent, className, id }: ContentSectionProps) => {
  return (
    <Paper
      elevation={3}
      component="div"
      className={mergeStyles('rounded-2xl bg-(--color-background-alt) p-4 lg:p-7', className)}
      id={id}
    >
      {title && (
        <div className="mb-9 flex items-center justify-between pl-4">
          <Typography variant="h2" className="text-1 xl:text-[1.5rem]">
            {title}
          </Typography>
          {headerContent}
        </div>
      )}
      <div className="flex flex-col gap-5">{children}</div>
    </Paper>
  );
};

export default ContentSection;
