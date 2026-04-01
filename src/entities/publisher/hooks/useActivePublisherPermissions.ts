import { useUser } from '@/src/entities/user';

import usePublisherStateMachine from '../store/hooks/usePublisherStateMachine';

const useActivePublisherPermissions = () => {
  const { user } = useUser();
  const { activePublisher } = usePublisherStateMachine();

  const isLifecycleEditable = user.isSuperuser || (activePublisher ? activePublisher.workLifecycle : false);
  const isImprintEditable = user.isSuperuser || (activePublisher ? activePublisher.publisherAdmin : false);
  const isFileUploadEditable = user.isSuperuser || (activePublisher ? activePublisher.cdnWrite : false);

  return {
    idDragAndDropEnabled: isFileUploadEditable,
    isImprintEditable: isImprintEditable,
    isStatusEditable: isLifecycleEditable,
    isPublicationDateEditable: isLifecycleEditable,
    isWithdrawnDateEditable: isLifecycleEditable,
    isFeaturedVideoEditable: isFileUploadEditable,
  };
};

export default useActivePublisherPermissions;
