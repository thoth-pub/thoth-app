import CreateWorkCopy from '@/src/features/work/CreateWorkCopy/CreateWorkCopy';
import { ContentSection, TranslatedContent, Typography } from '@/src/shared/ui';

type CopyWorkProps = {
  isTranslation: boolean;
};

const CopyWork = ({ isTranslation }: CopyWorkProps) => {
  return (
    <>
      <ContentSection>
        <Typography variant="h1" component="h1" className="max-w-[90%]">
          {isTranslation ? (
            <TranslatedContent content="new translation" />
          ) : (
            <TranslatedContent content="new edition" />
          )}
        </Typography>
      </ContentSection>
      <CreateWorkCopy isTranslation={isTranslation} />
    </>
  );
};

export default CopyWork;
