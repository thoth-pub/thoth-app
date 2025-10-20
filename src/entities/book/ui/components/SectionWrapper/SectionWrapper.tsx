import { Typography } from '@/src/shared/ui';

const SectionWrapper = ({ title, children }: { title: string; children: Readonly<React.ReactNode> }) => {
  return (
    <section className="flex flex-col gap-6">
      <Typography component="h2" variant="h1" color="primary">
        {title}
      </Typography>
      {children}
    </section>
  );
};

export default SectionWrapper;
