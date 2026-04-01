import type { LinkedPublisher } from '@/src/entities/auth';

export const convertLinkedPublishers = (linkedPublishers: LinkedPublisher[]) => {
  return linkedPublishers.map((publisher) => publisher.publisherId);
};
