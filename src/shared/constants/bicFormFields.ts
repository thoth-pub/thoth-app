import { BIC_CODES } from '../utils/subjects/bic-codes';

export const bicFormFields = Object.entries(BIC_CODES).map(([value, label]) => ({
  value,
  label: `${value} (${label}) `,
}));
