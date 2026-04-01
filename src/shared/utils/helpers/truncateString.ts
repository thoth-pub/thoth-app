export const truncateString = (string: string, length: number, symbol = '...') => {
  return string.length > length ? string.slice(0, length - symbol.length) + symbol : string;
};
