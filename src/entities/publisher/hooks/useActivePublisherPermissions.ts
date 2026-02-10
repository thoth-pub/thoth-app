import { useUser } from '@/src/entities/user';

import usePublisherStateMachine from '../store/hooks/usePublisherStateMachine';

const useActivePublisherPermissions = () => {
  const { user } = useUser();
  const { activePublisher } = usePublisherStateMachine();

  const isLifecycleEditable = user.isSuperuser || (activePublisher ? activePublisher.workLifecycle : false);
  const idDragAndDropEnabled = user.isSuperuser || (activePublisher ? activePublisher.cdnWrite : false);
  const isImprintEditable = user.isSuperuser || (activePublisher ? activePublisher.publisherAdmin : false);

  return {
    idDragAndDropEnabled,
    isImprintEditable: isImprintEditable,
    isStatusEditable: isLifecycleEditable,
    isPublicationDateEditable: isLifecycleEditable,
    isWithdrawnDateEditable: isLifecycleEditable,
  };
};

export default useActivePublisherPermissions;
