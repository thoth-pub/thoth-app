export const capitalizeFirstLetter = (string: string) => {
  return string[0].toUpperCase() + string.slice(1);
};

export const emptyToNull = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};
