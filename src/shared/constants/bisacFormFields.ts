import { BISAC_CODES } from '../utils/subjects/bisac-codes';

export const bisacFormFields = Object.entries(BISAC_CODES).map(([value, label]) => ({
  value,
  label: `${label} (${value})`,
}));
