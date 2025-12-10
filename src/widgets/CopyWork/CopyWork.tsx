import CreateWorkCopy from '@/src/features/work/CreateWorkCopy/CreateWorkCopy';
import { Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type CopyWorkProps = {
  isTranslation: boolean;
};

const CopyWork = ({ isTranslation }: CopyWorkProps) => {
  return (
    <>
      <ContentSection>
        <Typography variant="h1" component="h1" className="max-w-[90%]">
          {isTranslation ? 'New translation' : 'New edition'}
        </Typography>
      </ContentSection>
      <CreateWorkCopy isTranslation={isTranslation} />
    </>
  );
};

export default CopyWork;
