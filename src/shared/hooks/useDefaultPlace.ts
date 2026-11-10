import type { ImprintId } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';

/** The imprint's default place from the settled identity; undefined until identity has settled. */
const useDefaultPlace = (imprintId: ImprintId) => {
  const { identitySettled, settledImprints } = useUser();

  if (!identitySettled) return undefined;

  const imprint = settledImprints.find((imprint) => imprint.id === imprintId);

  return imprint?.defaultPlace ?? '';
};

export default useDefaultPlace;
