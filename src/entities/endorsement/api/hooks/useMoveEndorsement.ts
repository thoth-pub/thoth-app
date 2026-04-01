import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { EndorsementId } from '../../model/endorsement.types';

const { ENDORSEMENT_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveEndorsement(props: BaseEditSectionProps) {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { endorsementService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ endorsementId, newOrdinal }: { endorsementId: EndorsementId; newOrdinal: number }) => {
      return endorsementService.moveEndorsement(endorsementId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ENDORSEMENT_MOVE_FAILED);
    },
  });

  return {
    moveEndorsement: mutateAsync,
    loading: isPending,
  };
}
