import { THEMA_CODES } from '../utils/subjects/thema-codes';

export const themaFormFields = Object.entries(THEMA_CODES).map(([value, label]) => ({
  value,
  label: `${label} (${value})`,
}));
