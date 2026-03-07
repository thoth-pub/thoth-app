import type { ImprintId } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';

const useDefaultPlace = (imprintId: ImprintId) => {
  const { userImprints } = useUser();

  const imprint = userImprints.find((imprint) => imprint.id === imprintId);

  return imprint?.defaultPlace ?? '';
};

export default useDefaultPlace;
