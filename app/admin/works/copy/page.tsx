import { WORK_COPY_VARIANTS } from '@/src/shared/constants';
import type { WorkCopyVariant } from '@/src/shared/types';
import { CopyWork } from '@/src/widgets';

type CopyWorkPageProps = {
  searchParams: {
    type: WorkCopyVariant;
  };
};

export default async function CopyWorkPage({ searchParams }: CopyWorkPageProps) {
  const { type = '' } = await searchParams;

  const isNewTranslation = type === WORK_COPY_VARIANTS.TRANSLATION;

  return <CopyWork isTranslation={isNewTranslation} />;
}
