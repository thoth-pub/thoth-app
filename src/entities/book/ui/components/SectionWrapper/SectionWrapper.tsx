import { Typography } from '@/src/shared/ui';

type SectionWrapperProps = {
  title: string | React.ReactNode;
  children: Readonly<React.ReactNode>;
};

const SectionWrapper = ({ title, children }: SectionWrapperProps) => {
  return (
    <div className="flex flex-col gap-6">
      <Typography component="h2" variant="h1" className="ml-3">
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default SectionWrapper;
