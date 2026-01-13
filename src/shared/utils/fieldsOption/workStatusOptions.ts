import { LOCALES, WorkStatuses } from '../../constants';

const workStatusOptions = [
  { value: WorkStatuses.enum.Forthcoming, label: 'forthcoming' },
  { value: WorkStatuses.enum.Active, label: 'active' },
  { value: WorkStatuses.enum.Cancelled, label: 'cancelled' },
  { value: WorkStatuses.enum.PostponedIndefinitely, label: 'postponed indefinitely' },
  { value: WorkStatuses.enum.Superseded, label: 'superseded' },
  { value: WorkStatuses.enum.Withdrawn, label: 'withdrawn' },
];

export const getWorkStatusOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: workStatusOptions,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
