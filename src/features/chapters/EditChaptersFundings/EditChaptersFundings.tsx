import { WorkEntity } from '@/src/entities/work/model/work.types';
import { BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';

type EditChaptersFundingsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersFundings = (props: EditChaptersFundingsProps) => {
  const { queryToken, chapters } = props;

  const fundings = chapters.flatMap((chapter) => chapter.fundings);

  console.log(fundings);

  return (
    <RecommendedSection title="Fundings" isEmpty={true} isValid={false}>
      {({ showRecommendations }) => <Typography>Fundings {showRecommendations}</Typography>}
    </RecommendedSection>
  );
};

export default EditChaptersFundings;
