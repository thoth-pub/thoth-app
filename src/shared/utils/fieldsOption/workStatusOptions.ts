import { WorkStatuses } from '../../constants/work';

export const workStatusOptions = [
  { value: WorkStatuses.enum.Forthcoming, label: 'forthcoming' },
  { value: WorkStatuses.enum.Active, label: 'active' },
  { value: WorkStatuses.enum.Cancelled, label: 'cancelled' },
  { value: WorkStatuses.enum.PostponedIndefinitely, label: 'postponed indefinitely' },
  { value: WorkStatuses.enum.Superseded, label: 'superseded' },
  { value: WorkStatuses.enum.Withdrawn, label: 'withdrawn' },
];
