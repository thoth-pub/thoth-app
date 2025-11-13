import { Typography } from '@/src/shared/ui';

const SectionWrapper = ({ title, children }: { title: string; children: Readonly<React.ReactNode> }) => {
  return (
    <div className="flex flex-col gap-6">
      <Typography component="h2" variant="h1">
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default SectionWrapper;
