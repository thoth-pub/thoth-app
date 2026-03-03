import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { SetId } from '../../model/set.types';

const { SET_ADD_TO_FAILED } = NOTIFICATIONS;

export const useAddToSet = (setId?: SetId) => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ setId, bookId, ordinal }: { setId: SetId; bookId: WorkId; ordinal: number }) => {
      return setService.addBookToSet(setId, bookId, ordinal);
    },
    onSuccess: () => {
      if (setId) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.set, setId] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.bookSetWorks, setId] });
      }

      queryClient.invalidateQueries({ queryKey: [QueryKeys.workSet] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_ADD_TO_FAILED);
    },
  });

  return { addToSet: mutateAsync, isPending };
};
