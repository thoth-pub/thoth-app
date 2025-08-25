import type { LinkedPublisher } from '@/interfaces/auth';

export const convertLinkedPublishers = (linkedPublishers: LinkedPublisher[]) => {
  return linkedPublishers.map((publisher) => publisher.publisherId);
};
